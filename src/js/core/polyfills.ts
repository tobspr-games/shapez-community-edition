// Converts from degrees to radians.
Math.radians = function (degrees: number): number {
    return (degrees * Math.PI) / 180.0;
};

// Converts from radians to degrees.
Math.degrees = function (radians: number): number {
    return (radians * 180.0) / Math.PI;
};

// Begins a path and draws a circle.
CanvasRenderingContext2D.prototype.beginCircle = function (x: number, y: number, r: number): void {
    this.beginPath();

    if (r < 0.05) {
        this.rect(x, y, 1, 1);
        return;
    }

    this.arc(x, y, r, 0, 2.0 * Math.PI);
};
