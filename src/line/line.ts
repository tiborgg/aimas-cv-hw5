
import * as _ from 'lodash';
import { grayToRgba, rgbaToGray } from '../image';
import { applyCannyUint8ClampedRgba } from '../filters';


const C_MIN_LINE_SIZE = 10;

const RANDOM_COLOR_SCALE = _.range( 0, 5000 ).map( () => {
    let chan = [ Math.random(), Math.random(), Math.random() ];

    // choose the channel to bias between 0.5 and 1
    let bias = Math.floor( Math.random() * 2.99 );

    chan[ bias ] = ( chan[ bias ] + 1 ) / 2;
    return [
        Math.floor( chan[ 0 ] * 255 ),
        Math.floor( chan[ 1 ] * 255 ),
        Math.floor( chan[ 2 ] * 255 ),
        255 ];
} );

const labelColor = l => {
    if ( l === 0 )
        return [ 0, 0, 0, 255 ];
    return RANDOM_COLOR_SCALE[ l % RANDOM_COLOR_SCALE.length ];
}

export function LineDetectorUint8ClampedRgba( lineBuffer ) {

    return (
        srcData: Uint8ClampedArray,
        dstData: Uint8ClampedArray,
        width: number,
        height: number ) => {

        applyLineDetectorUint8ClampedRgba( srcData, dstData, width, height, lineBuffer )
    }
}

// range for hysteresis thresholding
export const DEF_CANNY_GAUSSIAN_RADIUS = 2;
export const DEF_CANNY_HT_LOW = 0.050;
export const DEF_CANNY_HT_HIGH = 0.100;

export function applyLineDetectorUint8ClampedRgba(
    srcData: Uint8ClampedArray,
    dstData: Uint8ClampedArray,
    width: number,
    height: number,
    lineBuffer: any[] ) {

    const ix = i => i % width;
    const iy = i => Math.floor( i / width );

    let size = width * height;

    let edgeDataRgba = new Uint8ClampedArray( size * 4 );
    applyCannyUint8ClampedRgba(
        srcData,
        edgeDataRgba,
        width,
        height,
        DEF_CANNY_GAUSSIAN_RADIUS,
        DEF_CANNY_HT_LOW,
        DEF_CANNY_HT_HIGH );

    let edgeData = new Uint8ClampedArray( size );

    rgbaToGray( edgeDataRgba, edgeData );

    // 1 - single
    // 2 - row
    // 3 - col
    // 4 - cross

    let rowMarks = new Uint8ClampedArray( size );
    rowMarks.fill( 0 );

    let colMarks = new Uint8ClampedArray( size );
    colMarks.fill( 0 );

    let marks = new Uint8ClampedArray( size );
    marks.fill( 0 );

    const M_SINGLE = 1;
    const M_COLUMN = 2;
    const M_ROW = 3;
    const M_CROSS = 4;
    const M_PENDING = 5;

    // scan the image for row segments
    for ( let y = 1; y < height - 1; y++ ) {
        for ( let x = 1; x < width - 1; x++ ) {

            let i = y * width + x;
            let ir = i + 1; // right

            if (
                edgeData[ i ] === 255 &&
                edgeData[ ir ] === 255 ) {

                rowMarks[ i ] = 1;
                rowMarks[ ir ] = 1;
            }
        }
    }

    // scan the image for column segments
    for ( let y = 1; y < height - 1; y++ ) {
        for ( let x = 1; x < width - 1; x++ ) {

            let i = y * width + x;
            let ib = ( y + 1 ) * width + x; // bottom

            if (
                edgeData[ i ] === 255 &&
                edgeData[ ib ] === 255 ) {

                colMarks[ i ] = 1;
                colMarks[ ib ] = 1;
            }
        }
    }

    // scan the row and column registers to detect single and cross pixels
    // and possibly other types of cues

    for ( let y = 1; y < height - 1; y++ ) {
        for ( let x = 1; x < width - 1; x++ ) {

            let i = y * width + x;
            if ( edgeData[ i ] === 255 ) {

                let col = colMarks[ i ] === 1;
                let row = rowMarks[ i ] === 1;

                if ( !col && !row )
                    marks[ i ] = M_SINGLE; // single
                else if ( col && !row )
                    marks[ i ] = M_COLUMN; // column
                else if ( !col && row )
                    marks[ i ] = M_ROW; // row
                else if ( col && row )
                    marks[ i ] = M_CROSS; // cross
            }

            if ( x === 321 && y === 58 ) {
                console.log( marks[ i ] );
            }
        }
    }

    // connect the edge segments using connected components algorithm
    // use a 2x2 kernel to link together edge segments

    abstract class LineBuilder {

        currentLabel = 1;
        labels = new Uint32Array( size );
        labelEquiv = new Map<number, number>();

        link( ai, bi ) {

            const {
                labels,
                labelEquiv
            } = this;

            // performs the actual link between 2 pixels, 
            let alabel = labels[ ai ];
            let blabel = labels[ bi ];

            if ( !alabel && !blabel ) {
                // assign new label and register reflexive equivalence
                let newLabel = this.currentLabel++;
                labelEquiv.set( newLabel, newLabel );
                labels[ ai ] = newLabel;
                labels[ bi ] = newLabel;
            }

            else if ( alabel && blabel ) {
                // both pixels already have a label
                // if they are not equal, we register an equivalence
                // if they're equal, we don't need to do anything
                if ( alabel !== blabel ) {
                    let minLabel = Math.min( alabel, blabel );
                    let maxLabel = Math.max( alabel, blabel );
                    labelEquiv.set( maxLabel, minLabel );
                }
            }

            else if ( alabel ) {
                // only a has a label, assign the same label to b
                labels[ bi ] = alabel;
            }

            else if ( blabel ) {
                // only a has a label, assign the same label to a
                labels[ ai ] = blabel;
            }
        }

        label() {

            for ( let y = 0; y < height - 1; y++ ) {
                for ( let x = 0; x < width - 1; x++ ) {

                    // indices
                    let tli = y * width + x; //top-left
                    let tri = tli + 1; // top-right
                    let bli = ( y + 1 ) * width + x; // bottom-left
                    let bri = bli + 1; // bottom-right

                    // detect possible links
                    this.tryLink( tli, tri );
                    this.tryLink( tli, bli );
                    this.tryLink( tli, bri );
                    this.tryLink( tri, bli );
                    // tryLink( tri, bri );
                    // tryLink( bli, bri );
                }
            }
        }

        build() {

            let { currentLabel } = this;
            const {
                labels,
                labelEquiv
            } = this;

            let lines = new Map<number, number[]>(); // (connected component label, pixel offset)

            for ( let y = 0; y < height; y++ ) {
                for ( let x = 0; x < width; x++ ) {

                    let i = ( y * width + x );
                    let label = labelEquiv.get( labels[ i ] );

                    if ( !label )
                        continue;

                    labels[ i ] = label;

                    let connLabelPixels = lines.get( label );
                    if ( !lines.has( label ) ) {
                        connLabelPixels = [];
                        lines.set( label, connLabelPixels );
                    }

                    connLabelPixels.push( i );
                }
            }

            // remove noise
            for ( let l of lines ) {
                let indices = l[ 1 ];
                if ( indices.length < C_MIN_LINE_SIZE ) {
                    indices.forEach( i => labels[ i ] = 0 );
                    lines.delete( l[ 0 ] );
                }
            }

            return lines;
        }

        abstract tryLink( ai: number, bi: number ): void;
    }

    class RowLineBuilder
        extends LineBuilder {

        tryLink( ai, bi ) {
            let am = marks[ ai ];
            let bm = marks[ bi ];

            if ( !am || !bm )
                return false; // black pixels

            if ( am === M_COLUMN || bm === M_COLUMN )
                return false;

            this.link( ai, bi );
        }
    }

    class ColLineBuilder
        extends LineBuilder {

        tryLink( ai, bi ) {

            let ax = ix( ai );
            let ay = iy( ai );
            let bx = ix( bi );
            let by = iy( bi );

            let am = marks[ ai ];
            let bm = marks[ bi ];

            let diag = Math.abs( ax - bx ) > 0 || Math.abs( ay - by ) > 0;
            let row = ay === by;

            if ( !am || !bm )
                return false; // black pixels

            if ( am === M_ROW || bm === M_ROW || row )
                return false;

            if (diag) {

                // diagonal links are only allowed in 2 cases
                // a. a diagonal link to another column edge, in which case we link without any additional checks
                // b. one pixel noise, or a cross pixel, in which case we need to check


                
            }

            this.link( ai, bi );
        }
    }


    let rowLineBuilder = new RowLineBuilder();
    rowLineBuilder.label();

    let rowLines = rowLineBuilder.build();
    let rowLabels = rowLineBuilder.labels;


    let colLineBuilder = new ColLineBuilder();
    colLineBuilder.label();

    let colLines = colLineBuilder.build();
    let colLabels = colLineBuilder.labels;

    // try to fit lines through all the initial edge pixels
    Array.from( rowLines.values() ).forEach( indices => {

        // TEMP: detect line equation by margins
        let min = _.min( indices );
        let max = _.max( indices );

        let xmin = min % width;
        let ymin = Math.floor( min / width );
        let xmax = max % width;
        let ymax = Math.floor( max / width );

        let vec = [ ymax - ymin, xmax - xmin ];

        lineBuffer.push( { x1: xmin, y1: ymin, x2: xmax, y2: ymax, className: 'horizontal' } );
    } );


    // try to fit lines through all the initial edge pixels
    Array.from( colLines.values() ).forEach( indices => {

        // TEMP: detect line equation by margins
        let min = _.min( indices );
        let max = _.max( indices );

        let xmin = min % width;
        let ymin = Math.floor( min / width );
        let xmax = max % width;
        let ymax = Math.floor( max / width );

        let vec = [ ymax - ymin, xmax - xmin ];

        lineBuffer.push( { x1: xmin, y1: ymin, x2: xmax, y2: ymax, className: 'vertical' } );
    } );





    for ( let y = 1; y < height - 1; y++ ) {
        for ( let x = 1; x < width - 1; x++ ) {

            let i = y * width + x;
            let cr = labelColor( rowLabels[ i ] );
            let cc = labelColor( colLabels[ i ] );

            dstData[ i * 4 + 0 ] = ( cr[ 0 ] + cc[ 0 ] ) / 2;
            dstData[ i * 4 + 1 ] = ( cr[ 1 ] + cc[ 1 ] ) / 2;
            dstData[ i * 4 + 2 ] = ( cr[ 2 ] + cc[ 2 ] ) / 2;
            dstData[ i * 4 + 3 ] = 255;
        }
    }

    //srcData.map( ( v, i ) => dstData[ i ] = v );

    //grayToRgba( edgeData, dstData );
}