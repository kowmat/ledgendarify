const g = require('./generators.js')


function s_to_ms(s){
    return Math.round(s*1000)
}


function animResolver(
    anim_name,
    anim_options,
    curr_beat,
    color_1, color_2, color_prev,
    colorGenerator
) {
    let animations = []

    switch(anim_name) {
        case "sweep":
            let sweep = g.genSweep(
                anim_options.direction,
                anim_options.start_pos, anim_options.length,
                s_to_ms(curr_beat.duration),
                s_to_ms(curr_beat.start),
                g.genColor(
                    color_1.rgb[0], color_1.rgb[1], color_1.rgb[2]
                ),
                g.genColor(
                    color_2.rgb[0], color_2.rgb[1], color_2.rgb[2]
                )
            )
            animations.push(sweep)
            break

        case "pulse":
            let pulse = g.genPulse(
                true,
                0, 1,
                s_to_ms(curr_beat.duration*0.4),
                s_to_ms(curr_beat.duration*0.8),
                s_to_ms(curr_beat.start),
                g.genColor(
                    color_1.rgb[0], color_1.rgb[1], color_1.rgb[2]
                ),
                g.genColor(
                    color_2.rgb[0], color_2.rgb[1], color_2.rgb[2]
                )
            )
            animations.push(pulse)

            break

        case "fmfs":
            let fmfs = g.genFmfs(
                s_to_ms(curr_beat.duration),
                s_to_ms(curr_beat.start),
                g.genColor(
                    color_1.rgb[0], color_1.rgb[1], color_1.rgb[2]
                ),
                g.genColor(
                    color_2.rgb[0], color_2.rgb[1], color_2.rgb[2]
                )
            )
            animations.push(fmfs)

            break

        case "police":
            let police = g.genPolice(
                g.genColor(
                    color_1.rgb[0], color_1.rgb[1], color_1.rgb[2]
                ),
                g.genColor(
                    color_2.rgb[0], color_2.rgb[1], color_2.rgb[2]
                ),
                s_to_ms(curr_beat.duration),
                40,
                s_to_ms(curr_beat.start)
            )
            animations.push(police)

            break

        case "gradient":
            let two_colors_1 = two_colors_prev
            let two_colors_2 = colorGenerator(prev_color)
            let color_1 = two_colors_1[0]
            let color_2 = two_colors_1[1]
            let color_3 = two_colors_2[0]
            let color_4 = two_colors_2[1]
            prev_color = two_colors_2[1]
            let gradient = generators.genGradient(
                true,
                0, 1,
                s_to_ms(curr_beat.duration), 20, s_to_ms(curr_beat.start),
                generators.genColor(
                    color_1.rgb[0], color_1.rgb[1], color_1.rgb[2]
                ),
                generators.genColor(
                    color_2.rgb[0], color_2.rgb[1], color_2.rgb[2]
                ),
                generators.genColor(
                    color_3.rgb[0], color_3.rgb[1], color_3.rgb[2]
                ),
                generators.genColor(
                    color_4.rgb[0], color_4.rgb[1], color_4.rgb[2]
                )
            )
            animations.push(gradient)

            break
    }


    return {
        animations: animations,
        color_prev: color_2
    }
}



module.exports = {
    animResolver: animResolver
}
