"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var reducer_1 = __importDefault(require("../src/reducer"));
describe('Reducer', function () {
    it('should render a simple tag element without interpolations as itself', function () {
        var reducer = new reducer_1.default({});
        var tag = {
            type: 'tag',
            name: 'foo',
            rawName: 'Foo',
            attrs: { a: 1, b: "bar" },
            children: [],
            reduced: false
        };
        expect(reducer.reduce(tag, {})).toEqual(tag);
    });
});
