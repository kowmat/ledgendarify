package main

import (
    "github.com/franeklubi/ledgend/animations"
    "github.com/franeklubi/ledgend"
    "strings"
    "errors"
    "time"
    "log"
)


func SweepFromJSON(a AnimationJSON) ([]ledgend.Animation, error) {
    if ( len(a.Colors) < 2 ) {
        return nil, errors.New("Not enough colors in sweep call")
    }

    start := time.Now().Add(time.Millisecond*time.Duration(a.TimeOffset))
    duration := time.Millisecond*time.Duration(a.Duration)
    col_a := a.Colors[0]
    col_b := a.Colors[1]
    col_a_ledgend := ledgend.Color{col_a.R, col_a.G, col_a.B}
    col_b_ledgend := ledgend.Color{col_b.R, col_b.G, col_b.B}

    sweep := animations.Sweep(
        a.Direction,
        a.Start, a.Length,
        col_a_ledgend, col_b_ledgend,
        duration, start,
    )

    return []ledgend.Animation{sweep}, nil
}


func PulseFromJSON(a AnimationJSON) ([]ledgend.Animation, error) {
    if ( len(a.Colors) < 4 ) {
        return nil, errors.New("Not enough colors in pulse call")
    }

    start := time.Now().Add(time.Millisecond*time.Duration(a.TimeOffset))
    duration := time.Millisecond*time.Duration(a.Duration)
    duration_back := time.Millisecond*time.Duration(a.DurationBack)
    col_a := a.Colors[0]
    col_b := a.Colors[1]
    col_c := a.Colors[2]
    col_d := a.Colors[3]
    col_a_ledgend := ledgend.Color{col_a.R, col_a.G, col_a.B}
    col_b_ledgend := ledgend.Color{col_b.R, col_b.G, col_b.B}
    col_c_ledgend := ledgend.Color{col_c.R, col_c.G, col_c.B}
    col_d_ledgend := ledgend.Color{col_d.R, col_d.G, col_d.B}

    pulse_a, pulse_b := animations.Pulse(
        a.Direction,
        a.Start, a.Length,
        col_a_ledgend, col_b_ledgend,
        col_c_ledgend, col_d_ledgend,
        duration, duration_back,
        start,
    )

    return []ledgend.Animation{pulse_a, pulse_b}, nil
}


func resolveAnimation(a AnimationJSON) ([]ledgend.Animation, error) {
    log.Println("resolving anim...")
    var (
        anims   []ledgend.Animation
        err     error
    )

    name_string := strings.ToLower(a.Name)

    switch(name_string) {
        case "sweep":
            anims, err = SweepFromJSON(a)
            if ( err != nil ) {
                return nil, err
            }

        case "pulse":
            anims, err = PulseFromJSON(a)
            if ( err != nil ) {
                return nil, err
            }

        default:
            return nil, errors.New("Unknown animation type \""+name_string+"\"")
    }

    return anims, nil
}


func getAnimations(anims_json []AnimationJSON) ([]ledgend.Animation) {
    var anims []ledgend.Animation

    for _, a := range anims_json {
        resolved, err := resolveAnimation(a)
        if ( err != nil ) {
            log.Println(err)
        } else {
            anims = append(anims, resolved...)
        }
    }

    return anims
}
