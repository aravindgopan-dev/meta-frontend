import kaplay from "kaplay";

export default function initKaplay(){
    return kaplay({
        width:30*32,
        height:15*32,
        letterbox:true,
        global:false,
        debug:true,
        pixelDensity:devicePixelRatio,
        background:[ 0, 0, 0, 0 ] 
    })
}