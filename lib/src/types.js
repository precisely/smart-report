"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isTagElement(o) {
    return isElement(o) && o.type === 'tag';
}
exports.isTagElement = isTagElement;
function isTextElement(o) {
    return isElement(o) && o.type === 'text';
}
exports.isTextElement = isTextElement;
function isInterpolation(o) {
    return o && o.hasOwnProperty('interpolation') && o.type === 'interpolation';
}
exports.isInterpolation = isInterpolation;
function isElement(o) {
    return o && o.hasOwnProperty('type');
}
exports.isElement = isElement;
