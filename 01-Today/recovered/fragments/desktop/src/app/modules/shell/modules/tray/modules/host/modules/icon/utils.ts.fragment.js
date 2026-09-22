// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/modules/icon/utils.ts.
// The original TypeScript and import graph are not restored.


const applyBitmapOpacity = (bitmap, opacity)=>{
    if (opacity < 0 || opacity > 1) {
        throw new RangeError('Image opacity must be between 0 and 1.');
    }
    if (bitmap.length % 4 !== 0) {
        throw new RangeError('Native bitmap byte length must be divisible by four.');
    }
    const result = Buffer.from(bitmap);
    for(let alphaIndex = 3; alphaIndex < result.length; alphaIndex += 4){
        result[alphaIndex] = Math.round(result[alphaIndex] * opacity);
    }
    return result;
};
const createOpacityVariant = (source, opacity)=>{
    const result = external_electron_.nativeImage.createEmpty();
    for (const scaleFactor of source.getScaleFactors()){
        const size = source.getSize(scaleFactor);
        result.addRepresentation({
            buffer: applyBitmapOpacity(source.toBitmap({
                scaleFactor
            }), opacity),
            height: Math.round(size.height * scaleFactor),
            scaleFactor,
            width: Math.round(size.width * scaleFactor)
        });
    }
    result.setTemplateImage(source.isTemplateImage());
    return result;
};
