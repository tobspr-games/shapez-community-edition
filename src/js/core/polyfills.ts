// Converts from degrees to radians.
Math.radians = function (degrees: number): number {
    return (degrees * Math.PI) / 180.0;
};

// Converts from radians to degrees.
Math.degrees = function (radians: number): number {
    return (radians * 180.0) / Math.PI;
};
