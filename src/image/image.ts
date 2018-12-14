export type ImageDataFormat =

    /** 3-channel image matrix */
    'rgb' |

    /** 4-channel image matrix */
    'rgba' |

    /** Single-channel image matrix */
    'gray';

export type ImageDataType =

    /** Will use a Uint8ClampedArray with all values clamped in [0, 255] */
    'uint8Clamped' |

    /** Will use a Int32Array without any clamping */
    'int32' |
    /** Will use a Int32Array with all values clamped in [0, 255]*/
    'int32Clamped' |

    /** Will use a Float32Array without any clamping */
    'float32' |
    /** Will use a Float32Array with all values clamped in [0, 255]*/
    'float32Clamped';


export type TypedArray =
    Uint8ClampedArray |
    Int32Array |
    Float32Array;

export type ImageDataArrayType<TDataType> =
    TDataType extends 'uint8Clamped' ? Uint8ClampedArray :
    TDataType extends 'int32' ? Int32Array :
    TDataType extends 'int32Clamped' ? Int32Array :
    TDataType extends 'float32' ? Float32Array :
    TDataType extends 'float32Clamped' ? Float32Array :
    never;

export function clamp( val: number ) {
    return Math.min( 255, Math.max( 0, val ) );
}

export function rgbaToGray(
    srcData: Uint8ClampedArray,
    dstData: Uint8ClampedArray ) {

    for ( let i = 0; i < srcData.length; i += 4 ) {
        dstData[ i / 4 ] = clamp(
            0.2989 * srcData[ i + 0 ] +
            0.5870 * srcData[ i + 1 ] +
            0.1140 * srcData[ i + 2 ] ); // for now just discard alpha
    }
}

export function grayToRgba(
    srcData: Uint8ClampedArray,
    dstData: Uint8ClampedArray ) {

    for ( let i = 0; i < srcData.length; i++ ) {

        let j = i * 4;
        let v = srcData[ i ];
        dstData[ j + 0 ] = v;
        dstData[ j + 1 ] = v;
        dstData[ j + 2 ] = v;
        dstData[ j + 3 ] = 255;
    }
}



/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
 */
export function pixelRgbToHsv( r, g, b ) {
    // adapted from https://gist.github.com/mjackson/5311256
    r /= 255, g /= 255, b /= 255;

    var max = Math.max( r, g, b ), min = Math.min( r, g, b );
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if ( max == min ) {
        h = 0; // achromatic
    } else {
        switch ( max ) {
            case r: h = ( g - b ) / d + ( g < b ? 6 : 0 ); break;
            case g: h = ( b - r ) / d + 2; break;
            case b: h = ( r - g ) / d + 4; break;
        }

        h /= 6;
    }

    return [ h, s, v ];
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
export function pixelHsvToRgb( h, s, v ) {
    // adapted from https://gist.github.com/mjackson/5311256
    var r, g, b;

    var i = Math.floor( h * 6 );
    var f = h * 6 - i;
    var p = v * ( 1 - s );
    var q = v * ( 1 - f * s );
    var t = v * ( 1 - ( 1 - f ) * s );

    switch ( i % 6 ) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [ r * 255, g * 255, b * 255 ];
}


export function rgbaToHsva(
    srcData: Uint8ClampedArray,
    dstData: Float32Array ) {

    for ( let i = 0; i < srcData.length; i += 4 ) {
        let r = srcData[ i + 0 ];
        let g = srcData[ i + 1 ];
        let b = srcData[ i + 2 ];
        let a = srcData[ i + 3 ];

        let hsv = pixelRgbToHsv( r, g, b );

        dstData[ i + 0 ] = hsv[ 0 ];
        dstData[ i + 1 ] = hsv[ 1 ];
        dstData[ i + 2 ] = hsv[ 2 ];
        dstData[ i + 3 ] = a;
    }
}

export function hsvaToRgba(
    srcData: Float32Array,
    dstData: Uint8ClampedArray ) {

    for ( let i = 0; i < srcData.length; i += 4 ) {
        let h = srcData[ i + 0 ];
        let s = srcData[ i + 1 ];
        let v = srcData[ i + 2 ];
        let a = srcData[ i + 3 ];

        debugger;

        let rgb = pixelHsvToRgb( h, s, v );

        dstData[ i + 0 ] = rgb[ 0 ];
        dstData[ i + 1 ] = rgb[ 1 ];
        dstData[ i + 2 ] = rgb[ 2 ];
        dstData[ i + 3 ] = a;
    }
}

export class Image<TDataType extends ImageDataType> {

    data: ImageDataArrayType<TDataType>;
    dataFormat: ImageDataFormat;
    dataType: ImageDataType;

    width: number;
    height: number;

    constructor() {

    }

    toEmptyRgba() {

    }
}