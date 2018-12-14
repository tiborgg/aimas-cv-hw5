import * as _ from 'lodash';
import { Kernel, convolveFloat32ClampedGray, rgbaToGray, grayToRgba } from '../image';
import { GaussianUint8ClampedRgba } from './gaussian';

export const DEF_SOBEL_GAUSSIAN_RADIUS = 2;

export function getSobelXKernel() {
    return new Kernel( 3, 3, [
        -1, 0, 1,
        -2, 0, 2,
        -1, 0, 1
    ] );
}
export function getSobelYKernel() {
    return new Kernel( 3, 3, [
        1, 2, 1,
        0, 0, 0,
        -1, -2, -1
    ] );
}

export function SobelUint8ClampedRgba( gaussianRadius: number ) {
    return (
        srcData: Uint8ClampedArray,
        dstData: Uint8ClampedArray,
        width: number,
        height: number ) => {

        applySobelUint8ClampedRgba( srcData, dstData, width, height, gaussianRadius );
    }
}

export function applySobelUint8ClampedRgba(
    srcData: Uint8ClampedArray,
    dstData: Uint8ClampedArray,
    width: number,
    height: number,
    gaussianRadius: number = DEF_SOBEL_GAUSSIAN_RADIUS ) {

    let gaussian = GaussianUint8ClampedRgba( gaussianRadius );

    let blurData = new Uint8ClampedArray( width * height * 4 )
    gaussian( srcData, blurData, width, height );

    let grayData = new Uint8ClampedArray( width * height );
    let tmpXData = new Float32Array( width * height );
    let tmpYData = new Float32Array( width * height );

    rgbaToGray( blurData, grayData );

    convolveFloat32ClampedGray( getSobelXKernel(), grayData, tmpXData, width, height );
    convolveFloat32ClampedGray( getSobelYKernel(), grayData, tmpYData, width, height );

    for ( let i = 0; i < tmpXData.length; i++ ) {
        grayData[ i ] = Math.sqrt(
            Math.pow( tmpXData[ i ], 2 ) +
            Math.pow( tmpYData[ i ], 2 ) );
    }

    grayToRgba( grayData, dstData );
}