import './app.less';

import * as assert from 'assert';
import * as React from 'react';
import { observable, IObservableArray } from 'mobx';
import { observer } from 'mobx-react';
import * as _ from 'lodash';

import { Delaunay } from "d3-delaunay";
import * as math from 'mathjs';


let rot = Math.PI / 7;
let rotm = math.matrix( [
    [ Math.cos( rot ), -Math.sin( rot ) ],
    [ Math.sin( rot ), Math.cos( rot ) ]
] );

const LINES = [
    [ [ 1, 2 ], [ 1, 5 ] ],
    [ [ 2, 6 ], [ 10, 6 ] ],
    [ [ 13, 5 ], [ 13, 2 ] ],
    [ [ 12, 1 ], [ 2, 1 ] ]
]

console.log()

@observer
export class Hw5AppRectVoronoi extends React.Component {

    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;

    @observable
    lines: IObservableArray<{
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        className: string
    }> = observable.array( LINES.map( l => {

        return {
            x1: l[ 0 ][ 0 ],
            y1: l[ 0 ][ 1 ],
            x2: l[ 1 ][ 0 ],
            y2: l[ 1 ][ 1 ]
        }
    } ) );

    @observable
    voronoiPath = '';

    constructor( props ) {
        super( props );
    }

    render() {

        const { canvas } = this;

        let width = 800;
        let height = 450;

        return (
            <div id="app">
                <aside id="sidebar">
                    <div className="filter">
                        <div className="heading">
                            <h4>Stop sign filter</h4>
                        </div>
                    </div>
                </aside>

                <main id="content">
                    <header id="header">

                    </header>

                    <div id="image">
                        <div id="imageInner">
                            <div id="canvasOuter">
                                <canvas id="canvas" ref={ref => this.canvas = ref} width={width} height={height} />
                                <svg viewBox={`0 0 14 7`} width={width} height={height}>

                                    {this.lines.map( ( line, i ) =>
                                        <line className={`line ${line.className} rect-line`}
                                            key={i}
                                            x1={line.x1}
                                            y1={line.y1}
                                            x2={line.x2}
                                            y2={line.y2} />
                                    )}

                                    <path d={this.voronoiPath} stroke="red" strokeWidth="0.1" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </main>
            </div >
        );
    }

    componentDidMount() {
        this.canvasContext = this.canvas.getContext( '2d' );

        let points = LINES.reduce( ( prev, curr, i ) => {
            prev.push( curr[ 0 ] )
            prev.push( curr[ 1 ] )
            return prev;
        }, [] )

        const delaunay = Delaunay.from( points );
        const voronoi = delaunay.voronoi( [ -2, -2, 15, 15 ] );

        points.forEach( ( p, pi ) => {

            let x = p[ 0 ];
            let y = p[ 1 ];

            let ci = delaunay.find( x, y )
            
        } );

        this.voronoiPath = voronoi.render()
    }

}