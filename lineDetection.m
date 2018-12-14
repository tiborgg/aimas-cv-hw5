img = imread('fence.jpg');
img = rgb2gray(img);
cnvImg = edge(img, 'canny');
imshow(cnvImg);