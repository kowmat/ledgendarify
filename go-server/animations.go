package main

import (
    "github.com/franeklubi/ledgend/animations"
    "github.com/franeklubi/ledgend"
    "strings"
    "errors"
    "time"
    "log"
)


func getParams(a AnimationJSON) (time.Time, []time.Duration, []ledgend.Color) {
    var (
        cols    []ledgend.Color
    )

    // calculating times
    start := time.Now().Add(time.Millisecond*time.Duration(a.TimeOffset))
    duration := time.Millisecond*time.Duration(a.Duration)
    duration_back := time.Millisecond*time.Duration(a.DurationTwo)

    durations := []time.Duration{duration, duration_back}

    // converting colors to ledgend.Color
    for _, c := range a.Colors {
        cols = append(cols, ledgend.Color(c))
    }

    return start, durations, cols
}


func SweepFromJSON(a AnimationJSON) ([]ledgend.Animation, error) {
    if ( len(a.Colors) < 2 ) {
        return nil, errors.New("Not enough colors in sweep call")
    }

    start, durations, cols := getParams(a)

    sweep := animations.Sweep(
        a.Direction,
        a.Start, a.Length,
        cols[0], cols[1],
        durations[0], start,
    )

    return []ledgend.Animation{sweep}, nil
}


func PulseFromJSON(a AnimationJSON) ([]ledgend.Animation, error) {
    if ( len(a.Colors) < 4 ) {
        return nil, errors.New("Not enough colors in pulse call")
    }

    start, durations, cols := getParams(a)

    pulse_a, pulse_b := animations.Pulse(
        a.Direction,
        a.Start, a.Length,
        cols[0], cols[1],
        cols[2], cols[3],
        durations[0], durations[1],
        start,
    )

    return []ledgend.Animation{pulse_a, pulse_b}, nil
}


func StroboFromJSON(a AnimationJSON) ([]ledgend.Animation, error) {
    if ( len(a.Colors) < 4 ) {
        return nil, errors.New("Not enough colors in strobo call")
    }

    start, durations, cols := getParams(a)

    anims := animations.Strobo(
        cols[0], cols[1],
        cols[2], cols[3],
        durations[0], durations[1],
        start,
    )

    return anims, nil
}


func FmfsFromJSON(a AnimationJSON) ([]ledgend.Animation, error) {
    if ( len(a.Colors) < 2 ) {
        return nil, errors.New("Not enough colors in fmfs call")
    }

    start, durations, cols := getParams(a)

    fmfs_a, fmfs_b := animations.FromMiddleFullSweep(
        cols[0], cols[1],
        durations[0],
        start,
    )

    return []ledgend.Animation{fmfs_a, fmfs_b}, nil
}


func GradientOverTimeFromJSON(a AnimationJSON) ([]ledgend.Animation, error) {
    if ( len(a.Colors) < 4 ) {
        return nil, errors.New("Not enough colors in gradient call")
    }

    start, durations, cols := getParams(a)

    anims := animations.GradientOverTime(
        a.Direction,
        a.Start, a.Length,
        cols[0], cols[1],
        cols[2], cols[3],
        durations[0], durations[1],
        start,
    )

    return anims, nil
}


func resolveAnimation(a AnimationJSON) ([]ledgend.Animation, error) {
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

        case "strobo":
            anims, err = StroboFromJSON(a)
            if ( err != nil ) {
                return nil, err
            }

        case "fmfs":
            anims, err = FmfsFromJSON(a)
            if ( err != nil ) {
                return nil, err
            }

        case "gradient":
            anims, err = GradientOverTimeFromJSON(a)
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
