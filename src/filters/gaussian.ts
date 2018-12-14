import {
    Kernel,
    convolveUint8ClampedGray,
    convolveUint8ClampedRgba,
    convolveFloat32ClampedGray,
    convolveFloat32ClampedRgba
} from '../image';


function getGaussianKernelVector( radius: number ) {

    let r = Math.ceil( radius );
    let rows = r * 2 + 1;
    let matrix: number[] = [];
    let sigma = radius / 3;
    let sigma22 = 2 * sigma * sigma;
    let sigmaPi2 = 2 * Math.PI * sigma;
    let sqrtSigmaPi2 = Math.sqrt( sigmaPi2 );
    let radius2 = radius * radius;
    let total = 0;
    let index = 0;
    for ( let row = -r; row <= r; row++ ) {
        let distance = row * row;
        if ( distance > radius2 )
            matrix[ index ] = 0;
        else
            matrix[ index ] = Math.exp( -( distance ) / sigma22 ) / sqrtSigmaPi2;
        total += matrix[ index ];
        index++;
    }
    for ( let i = 0; i < rows; i++ )
        matrix[ i ] /= total;

    return matrix;
}

function getGaussianHKernel( radius: number ) {
    let matrix = getGaussianKernelVector( radius );
    return new Kernel( matrix.length, 1, matrix );
}
function getGaussianVKernel( radius: number ) {
    let matrix = getGaussianKernelVector( radius );
    return new Kernel( 1, matrix.length, matrix );
}

export function GaussianUint8ClampedRgba( radius: number ) {
    return (
        srcData: Uint8ClampedArray,
        dstData: Uint8ClampedArray,
        width: number,
        height: number ) => {

        applyGaussianUint8ClampedRgba( srcData, dstData, width, height, radius );
    }
}

export function applyGaussianUint8ClampedRgba(
    srcData: Uint8ClampedArray,
    dstData: Uint8ClampedArray,
    width: number,
    height: number,
    radius: number ) {

    let tmpData = new Uint8ClampedArray( width * height * 4 );

    convolveUint8ClampedRgba( getGaussianHKernel( radius ), srcData, tmpData, width, height );
    convolveUint8ClampedRgba( getGaussianVKernel( radius ), tmpData, dstData, width, height );
}

export function applyGaussianFloat32ClampedGray(
    srcData: Uint8ClampedArray,
    dstData: Float32Array,
    width: number,
    height: number,
    radius: number ) {

    let tmpData = new Float32Array( width * height );

    convolveFloat32ClampedGray( getGaussianHKernel( radius ), srcData, tmpData, width, height );
    convolveFloat32ClampedGray( getGaussianVKernel( radius ), tmpData, dstData, width, height );
}