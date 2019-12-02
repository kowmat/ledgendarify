
function genColor(r, g, b) {
    return {
        "r": r,
        "g": g,
        "b": b
    }
}


function genAnimation(
    name,                           // string
    direction,                      // bool
    start_pos, length,              // float 0 to 1
    duration, duration_two, offset, // int milliseconds
    arr_color                       // use genColor
) {
    return {
        "name": name,
        "direction": direction,
        "start": start,
        "length": length,
        "duration": duration,
        "duration_two": duration_two,
        "time_offset": offset,
        "colors": arr_color
    }
}


function genSweep(
    direction,          // bool
    start_pos, length,  // float 0 to 1
    duration, offset,   // int milliseconds
    start_col, end_col  // use genColor
) {
    return genAnimation(
        "sweep",
        direction,
        start_pos, length,
        duration, 0, offset,
        [col_a, col_b]
    )
}


function genPulse(
    direction,                          // bool
    start_pos, length,                  // float 0 to 1
    duration, duration_back, offset,    // int milliseconds
    start_col_a, end_col_a,             // use genColor
    start_col_b, end_col_b              // use genColor
) {
    return genAnimation(
        "pulse",
        direction,
        start_pos, length,
        duration, duration_back, offset,
        [start_col_a, end_col_a, start_col_b, end_col_b]
    )
}


function genStrobo(
    duration, interval, offset, // int milliseconds
    start_col_a, end_col_a,     // use genColor
    start_col_b, end_col_b      // use genColor
) {
    return genAnimation(
        "strobo",
        true,
        0, 1,
        duration, interval, offset,
        [start_col_a, end_col_a, start_col_b, end_col_b]
    )
}


function genFmfs(
    duration, offset,   // int milliseconds
    start_col, end_col  // use genColor
) {
    return genAnimation(
        "fmfs",
        true,
        0, 1,
        duration, 0, offset,
        [start_col, end_col]
    )
}


function genGradient(
    direction,                  // bool
    start_pos, length,          // float 0 to 1
    duration, interval, offset, // int milliseconds
    start_col_a, end_col_a,     // use genColor
    start_col_b, end_col_b      // use genColor
) {
    return genAnimation(
        "gradient",
        direction,
        start_pos, length,
        duration, interval, offset,
        [start_col_a, end_col_a, start_col_b, end_col_b]
    )
}


function genPolice(
    left_col, right_col,        // use genColor
    duration, interval, offset  // int milliseconds
) {
    return genAnimation(
        "police",
        true,
        0, 1,
        duration, interval, offset,
        [start_col, end_col]
    )
}


function genPing(
    direction,                      // bool
    duration, interval, offset,     // int milliseconds
    start_col_ping, end_col_ping,   // use genColor
    start_col_back, end_col_back    // use genColor
) {
    return genAnimation(
        "ping",
        direction,
        0, 1,
        duration, interval, offset,
        [start_col_ping, end_col_ping, start_col_back, end_col_back]
    )
}



module.exports = {
    genColor: genColor,
    genAnimation: genAnimation,
    genSweep: genSweep,
    genPulse: genPulse,
    genStrobo: genStrobo,
    genFmfs: genFmfs,
    genGradient: genGradient,
    genPolice: genPolice,
    genPing: genPing
}
