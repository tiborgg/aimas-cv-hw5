# Straight line / rectangle detection (Homework 5) for Computer Vision course (Unfinished)
This demo contains a partially working line detection algorithm based on ideas found in a 2006 paper named "A straight line detection using principal component analysis" by Yun-Seok Lee et al. (https://www.sciencedirect.com/science/article/abs/pii/S0167865506001383). I only got to the edge labeling part using column, row, cross and single primitives, but couldn't finish the PCA step.

The demo only renders line segments detected using column and row primitives, and I used a simple min/max hack to have something to render based on the detected structures.

In terms of rectangle detection, which I didn't get to implement at all, my plan was to use a Voronoi partition around the points defining the line segments, build a graph search structure around the cells in order to build candidate quadrilaterals, then test each of those to see if they match a rectangle shape.