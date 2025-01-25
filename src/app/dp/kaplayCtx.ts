import kaplay from "kaplay";

export default function initKaplay(){
    return kaplay({
        width:window.innerWidth,
        height:window.innerHeight,
        letterbox:true,
        global:false,
        debug:true,
        pixelDensity:devicePixelRatio,
        background:[ 0, 0, 0, 0 ] 
    })
}