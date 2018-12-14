import * as _ from 'lodash';
import { clamp, TypedArray, ImageDataFormat, ImageDataType, ImageDataArrayType } from './image';

export class Kernel {

    readonly matrix: Float32Array;
    readonly width: number;
    readonly height: number;

    constructor(
        width: number,
        height: number,
        matrix: number[] ) {

        this.width = width;
        this.height = height;
        this.matrix = new Float32Array( matrix );
    }
}

/**
 * Simple dispatcher for the channel count based on the image data format.
 */
function getChannelCount(
    dataFormat?: ImageDataFormat ) {

    switch ( dataFormat ) {
        case 'rgb': return 3;
        case 'rgba': return 4;
        case 'gray': return 1;
    }

    return 1;
}


const Uint8ClampedChannelCallback = ( val: number ) => clamp( Math.floor( val + 0.5 ) );
const Int32ChannelCallback = ( val: number ) => val;
const Int32ClampedChannelCallback = ( val: number ) => clamp( Math.floor( val + 0.5 ) );
const Float32ChannelCallback = ( val: number ) => val;
const Float32ClampedChannelCallback = ( val: number ) => clamp( val );

/** 
 * Simple dispatcher for the channel callback based on the image data type. 
 */
function getChannelCallback(
    dataType?: ImageDataType ) {

    switch ( dataType ) {
        case "uint8Clamped": return Uint8ClampedChannelCallback;
        case "int32": return Int32ChannelCallback;
        case "int32Clamped": return Int32ClampedChannelCallback;
        case "float32": return Float32ChannelCallback;
        case "float32Clamped": return Float32ClampedChannelCallback;
    }

    return Float32ChannelCallback;
}

export interface ConvolveOptions {
    kernel: Kernel,
    srcData: TypedArray,
    dstData: Float32Array,
    width: number,
    height: number,
    dataFormat?: ImageDataFormat,
    dataType?: ImageDataType
}


type ConvolveFunction<TDataType extends ImageDataType> = (
    kernel: Kernel,
    srcData: TypedArray,
    dstData: ImageDataArrayType<TDataType>,
    width: number,
    height: number ) => void;

type ConvolveFunctionArguments<TDataType extends ImageDataType> = [
    Kernel,
    TypedArray,
    ImageDataArrayType<TDataType>,
    number,
    number ];

export function baseConvolve(
    kernel: Kernel,
    srcData: TypedArray,
    dstData: TypedArray,
    width: number,
    height: number,
    dataFormat: ImageDataFormat,
    dataType: ImageDataType ) {

    let channelCount = getChannelCount( dataFormat );
    let channelCallback = getChannelCallback( dataType );

    let index = 0;
    let { matrix } = kernel;
    let rows = kernel.height;
    let cols = kernel.width;
    let rows2 = Math.floor( rows / 2 );
    let cols2 = Math.floor( cols / 2 );

    let channels = Array( channelCount );

    for ( let y = 0; y < height; y++ ) {
        for ( let x = 0; x < width; x++ ) {

            channels.fill( 0 );

            for ( let row = -rows2; row <= rows2; row++ ) {

                let iy = y + row;
                let ioffset;
                if ( 0 <= iy && iy < height )
                    ioffset = iy * width;
                else
                    ioffset = y * width; // clamp

                let moffset = cols * ( row + rows2 ) + cols2;
                for ( let col = -cols2; col <= cols2; col++ ) {
                    let f = matrix[ moffset + col ];

                    let ix = x + col;
                    if ( !( 0 <= ix && ix < width ) )
                        ix = x; // clamp

                    let offset = ( ioffset + ix ) * channelCount;

                    for ( let o = 0; o < channelCount; o++ ) {
                        channels[ o ] += f * srcData[ offset + o ];
                    }
                }
            }

            for ( let o = 0; o < channelCount; o++ )
                dstData[ index++ ] = channelCallback( channels[ o ] );
        }
    }
}

function callBaseConvolve<TDataType extends ImageDataType>(
    args: ConvolveFunctionArguments<TDataType>,
    dataFormat: ImageDataFormat,
    dataType: ImageDataType ) {

    baseConvolve.apply( undefined, ( args as any ).concat( [ dataFormat, dataType ] ) );
}

function baseConvolveFactory<TDataType extends ImageDataType>(
    dataFormat: ImageDataFormat,
    dataType: ImageDataType ): ConvolveFunction<TDataType> {

    return ( ...args: ConvolveFunctionArguments<TDataType> ) => {

        callBaseConvolve(
            args,
            dataFormat,
            dataType );
    }
}

// #region convolveUint8Clamped functions
// -------
/**
 * Performs a convolution on a RGB (3-channel) image matrix and writes the output in a Uint8ClampedArray,
 * implicitly clamping each channel in [0, 255].
 */
export const convolveUint8ClampedRgb =
    baseConvolveFactory<'uint8Clamped'>( 'rgb', 'uint8Clamped' );

/**
 * Performs a convolution on a RGBA (4-channel) image matrix and writes the output in a Uint8ClampedArray,
 * implicitly clamping each channel in [0, 255].
 */
export const convolveUint8ClampedRgba =
    baseConvolveFactory<'uint8Clamped'>( 'rgba', 'uint8Clamped' );

/**
 * Performs a convolution on a RGBA (4-channel) image matrix and writes the output in a Uint8ClampedArray,
 * implicitly clamping each channel in [0, 255].
 */
export const convolveUint8ClampedGray =
    baseConvolveFactory<'uint8Clamped'>( 'gray', 'uint8Clamped' );
// -------
// #endregion


// #region convolveFloat32 functions
// -------
/**
 * Performs a convolution on a RGB (3-channel) image matrix and writes the output in a Float32Array,
 * leaving each channel un-clamped (negative values and values larger than 255 are possible).
 */
export const convolveFloat32Rgb =
    baseConvolveFactory<'float32'>( 'rgb', 'float32' );

/**
 * Performs a convolution on a RGBA (4-channel) image matrix and writes the output in a Float32Array,
 * leaving each channel un-clamped (negative values and values larger than 255 are possible).
 */
export const convolveFloat32Rgba =
    baseConvolveFactory<'float32'>( 'rgba', 'float32' );

/**
 * Performs a convolution on a RGBA (4-channel) image matrix and writes the output in a Float32Array,
 * leaving each channel un-clamped (negative values and values larger than 255 are possible).
 */
export const convolveFloat32Gray =
    baseConvolveFactory<'float32'>( 'gray', 'float32' );
// #endregion


// #region convolveFloat32Clamped functions
// -------
/**
 * Performs a convolution on a RGB (3-channel) image matrix and writes the output in a Float32Array,
 * explicitly clamping each channel in [0, 255].
 */
export const convolveFloat32ClampedRgb =
    baseConvolveFactory<'float32Clamped'>( 'rgb', 'float32Clamped' );

/**
 * Performs a convolution on a RGBA (4-channel) image matrix and writes the output in a Float32Array,
 * explicitly clamping each channel in [0, 255].
 */
export const convolveFloat32ClampedRgba =
    baseConvolveFactory<'float32Clamped'>( 'rgba', 'float32Clamped' );

/**
 * Performs a convolution on a RGBA (4-channel) image matrix and writes the output in a Float32Array,
 * explicitly clamping each channel in [0, 255].
 */
export const convolveFloat32ClampedGray =
    baseConvolveFactory<'float32Clamped'>( 'gray', 'float32Clamped' );
// #endregion