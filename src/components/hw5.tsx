import './app.less';

import * as assert from 'assert';
import * as React from 'react';
import { observable, IObservableArray } from 'mobx';
import { observer } from 'mobx-react';
import * as _ from 'lodash';
import { grayToRgba } from '../image';
import {
    LineDetectorUint8ClampedRgba
} from '../line';

const images = [
    'img1.jpg',
    'img2.jpg',
    'img3.jpg',
    'img4.jpg',
    'img5.jpg',
    'img6.jpg',
    'img7.jpg',
    'img8.jpg',
    'img9.jpg',
];

@observer
export class Hw5App extends React.Component {

    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;

    @observable
    lines: IObservableArray<{
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        className: string
    }> = observable.array();

    rectVoronoiPath: string = '';

    constructor( props ) {
        super( props );
    }

    render() {

        const RangeOptionElement = ( label, propName, min, max, step ) => {

            return (
                <div className="range-option">
                    <div className="option-label">
                        <label htmlFor={propName}>{label}</label>
                        <div className="value">{this[ propName ]}</div>
                    </div>
                    <div className="range-slider">
                        <input id={propName}
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={this[ propName ]}
                            onChange={evt => this[ propName ] = parseFloat( evt.target.value )} />

                    </div>
                </div>
            );
        }

        const { canvas } = this;

        let width = canvas ? canvas.width : 0;
        let height = canvas ? canvas.height : 0;

        return (
            <div id="app">
                <main id="content">
                    <header id="header">
                        {images.map( url => (
                            <div key={url} className="thumb" style={{ backgroundImage: `url('${url}')` }} onClick={evt => this.loadImageFromUrl( url )} />
                        ) )}
                    </header>

                    <div id="image">
                        <div id="imageInner">
                            <div id="canvasOuter">

                                <canvas id="canvas" ref={ref => this.canvas = ref} />
                                <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>

                                    {this.lines.map( ( line, i ) =>
                                        <line className={`line ${line.className}`}
                                            key={i}
                                            x1={line.x1}
                                            y1={line.y1}
                                            x2={line.x2}
                                            y2={line.y2} />
                                    )}

                                    <path d={this.rectVoronoiPath} stroke="gray" strokeWidth="0.5" />
                                </svg>

                                <button onClick={this.handleLineDetectorButtonClick.bind( this )} className="apply-button">Detect lines</button>
                            </div>
                        </div>
                    </div>
                </main>
            </div >
        );
    }

    componentDidMount() {
        this.canvasContext = this.canvas.getContext( '2d' );
        this.loadImageFromUrl( images[ 0 ] );

        //this.loadImageFromRandomNoise( 4, 4 );
        //this.loadStopMask();

        // this.applyFilter(
        //     StopFilterRgba() );

        //this.handleLineDetectorButtonClick();
    }

    loadImageFromRandomNoise( width, height ) {

        let ctx = this.canvasContext;

        this.canvas.width = width;
        this.canvas.height = height;

        let data = new Uint8ClampedArray( width * height * 4 );
        for ( let y = 0; y < height; y++ ) {
            for ( let x = 0; x < width; x++ ) {

                let r = 0;//Math.random() * 255;
                let g = 0;//Math.random() * 255;
                let b = 0;//Math.random() * 255;
                let a = 255;

                if ( y > 0 && y < 3 && x > 0 && y < 3 ) {
                    r = 255;//Math.random() * 255;
                    g = 0;//Math.random() * 255;
                    b = 0;//Math.random() * 255;
                    a = 255;
                }

                let offset = ( y * width + x ) * 4;

                data[ offset + 0 ] = r;
                data[ offset + 1 ] = g;
                data[ offset + 2 ] = b;
                data[ offset + 3 ] = a;
            }
        }

        ctx.putImageData( new ImageData( data, width, height ), 0, 0, 0, 0, width, height );
    }

    loadImageFromUrl( url ) {

        this.lines.clear();

        let ctx = this.canvasContext;
        let img = new Image();
        img.onload = () => {
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            ctx.drawImage( img, 0, 0 );
        }
        img.src = url;
    }

    loadGrayImageData(
        grayData: Uint8ClampedArray,
        width: number,
        height: number ) {

        let rgbaData = new Uint8ClampedArray( width * height * 4 );
        grayToRgba( grayData, rgbaData );

        this.loadRgbaImageData( rgbaData, width, height );
    }

    loadRgbaImageData(
        rgbaData: Uint8ClampedArray,
        width: number,
        height: number ) {

        const canvas = this.canvas;
        const ctx = this.canvasContext;

        canvas.width = width;
        canvas.height = height;

        let dstImgData = new ImageData( rgbaData, width, height );
        ctx.putImageData( dstImgData, 0, 0, 0, 0, width, height );
    }

    applyFilter( filter: Function ) {

        this.lines.clear();

        const canvas = this.canvas;
        const ctx = this.canvasContext;

        const {
            width,
            height
        } = canvas;

        let srcData = ctx.getImageData( 0, 0, width, height );
        let dstData = new Uint8ClampedArray( width * height * 4 );

        filter( srcData.data, dstData, width, height );

        this.loadRgbaImageData( dstData, width, height );
    }

    handleFileInputChange( evt ) {

        let file = evt.target.files[ 0 ] as File;
        this.loadImageFromUrl( URL.createObjectURL( file ) );
    }

    handleLineDetectorButtonClick() {

        this.lines.clear();
        this.applyFilter(
            LineDetectorUint8ClampedRgba( this.lines ) );

        // TEST voronoi partitioning on the detected lines
        // const delaunay = Delaunay.from( this.lines.reduce( ( acc, curr ) => {
        //     acc.push( [ curr.x1, curr.y1 ] )
        //     acc.push( [ curr.x2, curr.y2 ] )
        //     return acc;
        // }, [] ) );

        // const voronoi = delaunay.voronoi([0,0,this.canvas.width, this.canvas.height]);

        // this.rectVoronoiPath = voronoi.render()
    }
}