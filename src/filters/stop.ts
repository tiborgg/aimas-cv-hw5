import * as _ from 'lodash';

const MIN_R = 80;
const MAX_R = 255;
const MIN_G = 0;
const MAX_G = 80;
const MIN_B = 0;
const MAX_B = 80;
const MIN_CLUSTER_WIDTH = 50;
const MIN_CLUSTER_HEIGHT = 50;
const MIN_CLUSTER_RATIO = 0.8;
const STOP_BORDER_RATIO = 0.025;
const STOP_MAX_DIST = 0.2;

const STEP_MASK = new Uint8ClampedArray( 600 * 600 * 4 );

let img = new Image();
let canvas = document.createElement( 'canvas' );
let ctx = canvas.getContext( '2d' );
img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage( img, 0, 0 );
}
img.src = '/stopMask.png';

export function getStopMaskData( width, height ) {

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage( img, 0, 0, width, height );

    let imgData = ctx.getImageData( 0, 0, width, height );
    return imgData.data;
}

export function getStopMaskThresholdData( width, height ) {

    let rgbaData = getStopMaskData( width, height );
    let thrsData = new Uint8ClampedArray( width * height );

    applyColorBinaryThresholdRgba( rgbaData, thrsData, width, height );

    return thrsData;
}

function applyColorBinaryThresholdRgba(
    srcData: Uint8ClampedArray, // rgba
    dstData: Uint8ClampedArray, // single-channel 
    width: number,
    height: number ) {

    let index = 0;
    for ( let y = 0; y < height; y++ ) {
        for ( let x = 0; x < width; x++ ) {

            let o = ( y * width + x ) * 4;

            let r = srcData[ o + 0 ];
            let g = srcData[ o + 1 ];
            let b = srcData[ o + 2 ];
            let a = srcData[ o + 3 ];

            let val = (
                MIN_R <= r && r <= MAX_R &&
                MIN_G <= g && g <= MAX_G &&
                MIN_B <= b && b <= MAX_B ) ? 255 : 0;

            dstData[ index++ ] = val;
        }
    }
}

export function getStopFilterRegionsRgba(
    srcData: Uint8ClampedArray,
    width: number,
    height: number ) {

    // threshold the image by color, into a binary image
    // values that fall within the range defined by MIN_R, MAX_R, etc will be assigned the max value (255)
    // values that fall outside the ranges will be assigned the lowest value (0)

    let thrsData = new Uint8ClampedArray( width * height );
    let thrsIndex = 0;

    for ( let y = 0; y < height; y++ ) {
        for ( let x = 0; x < width; x++ ) {

            let o = ( y * width + x ) * 4;

            let r = srcData[ o + 0 ];
            let g = srcData[ o + 1 ];
            let b = srcData[ o + 2 ];
            let a = srcData[ o + 3 ];

            let val = (
                MIN_R <= r && r <= MAX_R &&
                MIN_G <= g && g <= MAX_G &&
                MIN_B <= b && b <= MAX_B ) ? 255 : 0;

            thrsData[ thrsIndex++ ] = val;
        }
    }

    // cluster the binary data by grouping together contiguous regions of points that have the max value
    // 2 points are connected only if they are connected on the vertical or on the horizontal axis
    // diagonal points are not considered to be connected (only if they share a common vertical / horizontal neighbour)
    interface Cluster {
        pixels: number[],
        x1: number,
        x2: number,
        y1: number,
        y2: number,
        width: number,
        height: number,
        ratio: number
    }

    type Visit = [ number, number, number?];

    let clusterCount = 1;
    let clusters: Cluster[] = [];
    let clusterMatrix = new Uint8ClampedArray( width * height );
    clusterMatrix.fill( 0 );

    for ( let y = 0; y < height; y++ ) {
        for ( let x = 0; x < width; x++ ) {
            // attempt to visit each pixel
            // the recursive visit method will stop before doing anything if the point was already visited
            // or if it's a black point

            let visitStack: Visit[] = [ [ x, y ] ];
            let visitPointer = 0;

            while ( visitPointer >= 0 ) {

                let visit = visitStack.pop();
                visitPointer--;

                let sx = visit[ 0 ];
                let sy = visit[ 1 ];
                let sc = visit[ 2 ];

                let yoffset = sy * width;
                let i = yoffset + sx;
                let v = thrsData[ i ];

                if ( clusterMatrix[ i ] > 0 )
                    continue; // pixel that was already visited

                if ( v !== 255 )
                    continue;

                if ( sx < 0 || sx > width - 1 || sy < 0 || sy > height - 1 )
                    continue; // out of bounds

                // we have an in-bound, white, non-visited pixel
                // if we don't have a provided cluster, we're calling this from the outside loop,
                // and because the point was not visited (i.e. not connected to any previous points),
                // we are safe to assign a new cluster to it
                let cluster;
                if ( sc === undefined ) {
                    sc = clusterCount++;
                    clusters[ sc ] = {
                        pixels: [],
                        x1: sx,
                        x2: sx,
                        y1: sy,
                        y2: sy,
                        width: 0,
                        height: 0,
                        ratio: 1
                    };
                }

                // register it as a visited pixel, with the corresponding associated cluster
                cluster = clusters[ sc ];
                clusterMatrix[ i ] = sc;

                cluster.pixels.push( i );

                // check bounds and modify if necessary
                if ( sx < cluster.x1 )
                    cluster.x1 = sx; // new min x
                if ( sx > cluster.x2 )
                    cluster.x2 = sx; // new max x
                if ( sy < cluster.y1 )
                    cluster.y1 = sy; // new min y
                if ( sy > cluster.y2 )
                    cluster.y2 = sy; // new max y

                // visit all the neighbors
                visitStack.push( [ sx + 1, sy, sc ] );
                visitPointer++;

                visitStack.push( [ sx - 1, sy, sc ] );
                visitPointer++;

                visitStack.push( [ sx, sy + 1, sc ] );
                visitPointer++;

                visitStack.push( [ sx, sy - 1, sc ] );
                visitPointer++;
            }
        }
    }

    // we have an array of clusters, each containing indices of the pixels that are connected
    // now we compute the bounding boxes for each cluster
    // we also discard the clusters that are below the specified size, both in terms of width and height,
    // or which have an aspect ratio unlikely to have been a square
    let prevClusters = clusters;
    clusters = [];
    for ( let c = 1; c < prevClusters.length; c++ ) {
        let cluster = prevClusters[ c ];
        let cwidth = cluster.x2 - cluster.x1;
        let cheight = cluster.y2 - cluster.y1;

        let ratio = cwidth / cheight;
        if ( ratio > 1 )
            ratio = 1 / ratio; // normalize the ratio in [0, 1]

        cluster.width = cwidth;
        cluster.height = cheight;
        cluster.ratio = ratio;

        if ( cwidth < MIN_CLUSTER_WIDTH ||
            cheight < MIN_CLUSTER_HEIGHT ||
            ratio < MIN_CLUSTER_RATIO ) {
            continue;
        }

        clusters.push( cluster );
    }

    // for each cluster, rescale the mask according to its bounding box
    // then compute the similarity between the mask and the cluster

    let regions = [];

    for ( let c = 0; c < clusters.length; c++ ) {

        let cluster = clusters[ c ];
        let maskGrayData = getStopMaskThresholdData( cluster.width, cluster.height );

        let cx1 = cluster.x1;
        let cx2 = cluster.x2;
        let cy1 = cluster.y1;
        let cy2 = cluster.y2;

        let dist = 0;

        // take each pixel from the cluster, and compare it with the same location in the mask
        for ( let cy = cy1; cy < cy2; cy++ ) {
            for ( let cx = cx1; cx < cx2; cx++ ) {

                let i = ( cy * width + cx );

                let mx = cx - cx1;
                let my = cy - cy1;
                let mi = ( my * cluster.width + mx );

                let v = thrsData[ i ];
                let mv = maskGrayData[ mi ];

                // compute the distance from the actual pixel to the mask pixel
                dist += Math.abs( ( mv - v ) / 255 );
            }
        }

        // adjust the similarity index
        dist /= ( cluster.width * cluster.height );

        if ( dist < STOP_MAX_DIST ) {

            let borderXAdjust = Math.round( cluster.width * STOP_BORDER_RATIO );
            let borderYAdjust = Math.round( cluster.height * STOP_BORDER_RATIO );

            regions.push( {
                x: cx1 - borderXAdjust,
                y: cy1 - borderYAdjust,
                width: cluster.width + borderXAdjust * 2,
                height: cluster.height + borderYAdjust * 2
            } );
        }
    }

    return regions;
}