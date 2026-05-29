/*
  algorithms.js — the parliament.

  121 independent algorithms, each assembled verbatim from a file that passed a node
  correctness gate over ~148,000 (timezone, instant) samples spanning 1970..2200 and every populated
  UTC offset. Each is an IIFE that registers itself with the engine via IIC.register(). They do not
  share state; they only share the question.

  Generated, not hand-written. See https://benjaminste.in/building-isitchristmas
*/

/* #1 — Hinnant civil_from_days [Calendrical Classics] */
(function () {
  // Howard Hinnant's civil_from_days: convert a day count relative to
  // 1970-01-01 into a proleptic-Gregorian (year, month, day) using the
  // 400-year "era" formulation. The trick is that it shifts the epoch to
  // 0000-03-01 so leap days fall at the end of each internal year, which
  // makes the month/day extraction branch-free integer arithmetic.
  //
  // Reference: https://howardhinnant.github.io/date_algorithms.html#civil_from_days

  function civilFromDays(z) {
    // z is days since 1970-01-01. Shift so day 0 is 0000-03-01.
    z += 719468;
    // era: the 400-year cycle this day lives in (146097 days per cycle).
    var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
    // day-of-era: 0..146096
    var doe = z - era * 146097;
    // year-of-era: 0..399
    var yoe = Math.floor(
      (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
    );
    var y = yoe + era * 400;
    // day-of-year, counting from March 1 (0..365)
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    // shifted month index: 0=March .. 11=February
    var mp = Math.floor((5 * doy + 2) / 153);
    var d = doy - Math.floor((153 * mp + 2) / 5) + 1; // 1..31
    var m = mp < 10 ? mp + 3 : mp - 9;                // 1..12
    // Re-anchor the year to a January start: months 1 and 2 belong to y+1.
    if (m <= 2) y += 1;
    return { y: y, m: m, d: d };
  }

  IIC.register({
    id: 1,
    name: "Hinnant civil_from_days",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology: "Takes floor(localMs / 86400000) as days since 1970-01-01 and runs Howard Hinnant's civil_from_days: shift the epoch to 0000-03-01, split into 400-year eras (146097 days), derive year-of-era, day-of-era, day-of-year, then a branch-free month/day extraction. Votes yes when the resulting month is 12 and day is 25.",
    flavor: "It moves the start of the year to March so February's leap day stops causing trouble, which is the kind of thing only a calendar nerd would call elegant.",
    vote: function (ctx) {
      var days = Math.floor(ctx.localMs / 86400000);
      var c = civilFromDays(days);
      return c.m === 12 && c.d === 25;
    }
  });
})();

/* #2 — Fliegel–Van Flandern JDN Decoder [Calendrical Classics] */
(function () {
  // Fliegel & Van Flandern (Communications of the ACM, 1968): a closed-form
  // integer pipeline that turns a Julian Day Number into a Gregorian (Y, M, D).
  // Every division below is integer (floor) division on non-negative operands,
  // so Math.floor on positive quotients reproduces the original FORTRAN ">> /"
  // behaviour exactly.

  // Unix epoch day 0 (1970-01-01) is Julian Day Number 2440588.
  var EPOCH_JDN = 2440588;

  function idiv(a, b) {
    // Integer division matching FORTRAN truncation. All call sites here feed
    // non-negative numerators across the supported 1970..2200 range, so a plain
    // floor is correct; use truncation toward zero to stay faithful regardless.
    return Math.trunc(a / b);
  }

  function christmasFromJDN(jdn) {
    var L = jdn + 68569;
    var N = idiv(4 * L, 146097);
    L = L - idiv(146097 * N + 3, 4);
    var I = idiv(4000 * (L + 1), 1461001);
    L = L - idiv(1461 * I, 4) + 31;
    var J = idiv(80 * L, 2447);
    var D = L - idiv(2447 * J, 80);
    L = idiv(J, 11);
    var M = J + 2 - 12 * L;
    // Year (Y) would be 100 * (N - 49) + I + L; we only need month and day.
    return M === 12 && D === 25;
  }

  IIC.register({
    id: 2,
    name: "Fliegel–Van Flandern JDN Decoder",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology: "Takes the integer day count from localMs (floor of localMs/86400000), adds 2440588 to turn it into a Julian Day Number, then runs the 1968 Fliegel & Van Flandern integer algorithm (the L/N/I/J chain of truncating divisions) to recover the Gregorian month and day, and reports whether they are December 25.",
    flavor: "A FORTRAN one-liner from 1968 that still knows exactly when to hang the stockings.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var jdn = epochDay + EPOCH_JDN;
      return christmasFromJDN(jdn);
    }
  });
})();

/* #3 — Richards JDN Decomposition [Calendrical Classics] */
(function () {
  // Richards' algorithm for converting a Julian Day Number to a Gregorian
  // (year, month, day), exactly as tabulated on Wikipedia's "Julian day" page.
  // Gregorian-variant constants:
  var JDN_Y = 4716;   // y
  var JDN_J = 1401;   // j
  var JDN_M = 2;      // m
  var JDN_N = 12;     // n
  var JDN_R = 4;      // r
  var JDN_P = 1461;   // p
  var JDN_V = 3;      // v
  var JDN_U = 5;      // u
  var JDN_S = 153;    // s
  var JDN_W = 2;      // w
  var JDN_B = 274277; // B
  var JDN_C = -38;    // C

  // JDN of the Unix epoch 1970-01-01 is 2440588, so JDN = epochDay + 2440588.
  var JDN_EPOCH = 2440588;

  // Integer floor division that stays correct for negative numerators (JS % and
  // truncated division round toward zero, which would break the algorithm for
  // pre-epoch dates). Richards' formulas are written for true integer floor.
  function fdiv(a, b) {
    return Math.floor(a / b);
  }
  function fmod(a, b) {
    return a - b * Math.floor(a / b);
  }

  // Richards' JDN -> (Y, M, D), Gregorian variant. Returns [Y, M, D].
  function richards(J) {
    var f = J + JDN_J + fdiv(fdiv(4 * J + JDN_B, 146097) * 3, 4) + JDN_C;
    var e = JDN_R * f + JDN_V;
    var g = fdiv(fmod(e, JDN_P), JDN_R);
    var h = JDN_U * g + JDN_W;
    var D = fdiv(fmod(h, JDN_S), JDN_U) + 1;
    var M = fmod(fdiv(h, JDN_S) + JDN_M, JDN_N) + 1;
    var Y = fdiv(e, JDN_P) - JDN_Y + fdiv(JDN_N + JDN_M - M, JDN_N);
    return [Y, M, D];
  }

  IIC.register({
    id: 3,
    name: "Richards JDN Decomposition",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology: "Takes the local epoch day (floor of localMs/86400000), adds 2440588 to get the Julian Day Number, then runs E.G. Richards' tabulated JDN-to-Gregorian conversion (constants y=4716, j=1401, p=1461, s=153, B=274277, C=-38) to recover year, month, and day. Votes yes when month is 12 and day is 25. Floor division is used throughout so pre-1970 dates convert correctly.",
    flavor: "A 4,000-year-old counting system, pressed into service to answer whether you should be opening presents.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var ymd = richards(epochDay + JDN_EPOCH);
      return ymd[1] === 12 && ymd[2] === 25;
    }
  });
})();

/* #4 — Meeus Julian-Day Inversion [Calendrical Classics] */
(function () {
  // Jean Meeus, "Astronomical Algorithms" (2nd ed.), chapter 7:
  // recover a Gregorian calendar date (year, month, day) from a Julian Day.
  //
  // We need the LOCAL civil date, so we work from the local epoch-day count
  // (whole days since 1970-01-01 in the visitor's wall clock). The Julian Day
  // Number of 1970-01-01 is 2440588 (JD 2440587.5 is local midnight of that
  // day). Adding the epoch-day count to 2440588 gives the JDN of the day in
  // question; running Meeus' procedure on it yields (y, m, d).
  //
  // Meeus' steps (book notation A, B, C, D, E):
  //   Z = floor(JD + 0.5)              integer part
  //   F = (JD + 0.5) - Z               fractional part (0 here, midday-aligned)
  //   if Z < 2299161 (before 1582-10-15 Gregorian reform): A = Z
  //   else: alpha = floor((Z - 1867216.25) / 36524.25)
  //         A = Z + 1 + alpha - floor(alpha / 4)
  //   B = A + 1524
  //   C = floor((B - 122.1) / 365.25)
  //   D = floor(365.25 * C)
  //   E = floor((B - D) / 30.6001)
  //   day   = B - D - floor(30.6001 * E) + F
  //   month = (E < 14) ? E - 1 : E - 13
  //   year  = (month > 2) ? C - 4716 : C - 4715

  function meeusCivil(epochDay) {
    // JDN of the local day. epochDay is an integer day index since 1970-01-01.
    var Z = epochDay + 2440588;        // integer Julian Day Number
    var F = 0;                         // we land exactly on a JDN, no fraction

    var A;
    if (Z < 2299161) {
      A = Z;
    } else {
      var alpha = Math.floor((Z - 1867216.25) / 36524.25);
      A = Z + 1 + alpha - Math.floor(alpha / 4);
    }

    var B = A + 1524;
    var C = Math.floor((B - 122.1) / 365.25);
    var D = Math.floor(365.25 * C);
    var E = Math.floor((B - D) / 30.6001);

    var day = B - D - Math.floor(30.6001 * E) + F;
    var month = (E < 14) ? E - 1 : E - 13;
    var year = (month > 2) ? C - 4716 : C - 4715;

    return { y: year, m: month, d: day };
  }

  IIC.register({
    id: 4,
    name: "Meeus Julian-Day Inversion",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology: "Converts the local epoch-day count to a Julian Day Number (adding 2440588), then runs Jean Meeus' calendar-from-JD procedure from Astronomical Algorithms chapter 7 (the A, B, C, D, E intermediates) to recover the civil year, month, and day. Votes yes when month is 12 and day is 25.",
    flavor: "The same arithmetic astronomers use to date eclipses, pointed at a far more pressing question.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var c = meeusCivil(epochDay);
      return c.m === 12 && c.d === 25;
    }
  });
})();

/* #5 — Rata Die (Reingold–Dershowitz) [Calendrical Classics] */
(function () {
  // Reingold & Dershowitz, "Calendrical Calculations".
  //
  // Their model represents a date as a "fixed day" (Rata Die, RD): an integer
  // count of days where RD 1 is the proleptic Gregorian date January 1 of year 1.
  // Conversion between calendars goes through this single integer pivot.
  //
  // In R&D's numbering (gregorian-epoch = RD 1 = 0001-01-01), the Unix epoch
  // 1970-01-01 is RD 719162, so the RD of the visitor's local civil day is
  // epochDay + 719162, where epochDay counts days since 1970-01-01.
  //
  // gregorian-from-fixed (R&D eq. 2.23) inverts an RD back to (year, month, day):
  //   1. Recover the year with a closed-form estimate from the day count, refined
  //      by checking whether the candidate year actually reaches `date`.
  //   2. Subtract the fixed day of that year's March-correcting prior day to get
  //      the day-within-year, then peel off the month with a piecewise linear map
  //      that accounts for the leap day landing at the end of the year.

  var GREGORIAN_EPOCH = 1; // RD of 0001-01-01 (proleptic Gregorian).
  var UNIX_RD = 719162;    // RD of 1970-01-01 in R&D numbering.

  function isGregorianLeapYear(year) {
    // R&D: leap if divisible by 4 and not (divisible by 100 but not 400).
    var m4 = mod(year, 4);
    if (m4 !== 0) return false;
    var m100 = mod(year, 100);
    return m100 !== 0 || mod(year, 400) === 0;
  }

  // Always-floor modulo so negative (proleptic) years behave like R&D's `mod`.
  function mod(a, b) {
    return a - b * Math.floor(a / b);
  }

  // fixed-from-gregorian (R&D eq. 2.17): RD of the first day of `year`.
  function fixedFromGregorianNewYear(year) {
    var y = year - 1;
    return (
      GREGORIAN_EPOCH - 1 +
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400)
    );
  }

  // gregorian-year-from-fixed (R&D eq. 2.20): which Gregorian year contains RD `date`.
  function gregorianYearFromFixed(date) {
    var d0 = date - GREGORIAN_EPOCH;          // days since 0001-01-01.
    var n400 = Math.floor(d0 / 146097);       // complete 400-year cycles.
    var d1 = mod(d0, 146097);
    var n100 = Math.floor(d1 / 36524);        // complete centuries within the cycle.
    var d2 = mod(d1, 36524);
    var n4 = Math.floor(d2 / 1461);           // complete 4-year cycles within the century.
    var d3 = mod(d2, 1461);
    var n1 = Math.floor(d3 / 365);            // complete years within the 4-year cycle.
    var year = 400 * n400 + 100 * n100 + 4 * n4 + n1;
    // The terminal day of a leap cycle (Dec 31) over-counts by one year; clamp it.
    return (n100 === 4 || n1 === 4) ? year : year + 1;
  }

  // gregorian-from-fixed (R&D eq. 2.23): full (year, month, day) for RD `date`.
  function gregorianFromFixed(date) {
    var year = gregorianYearFromFixed(date);
    var priorDays = date - fixedFromGregorianNewYear(year); // 0-based day within year.
    // Correction for the variable length of February.
    var marchFirst = fixedFromGregorianNewYear(year) + 31 + 28; // RD of Mar 1 less leap.
    var correction;
    if (date < marchFirst) {
      correction = 0;
    } else {
      correction = isGregorianLeapYear(year) ? 1 : 2;
    }
    var month = Math.floor((12 * (priorDays + correction) + 373) / 367);
    var monthStart = fixedFromGregorianMonth(year, month);
    var day = date - monthStart + 1;
    return { year: year, month: month, day: day };
  }

  // RD of the first day of (year, month) — fixed-from-gregorian with day = 1.
  function fixedFromGregorianMonth(year, month) {
    var newYear = fixedFromGregorianNewYear(year);
    var daysBeforeMonth =
      Math.floor((367 * month - 362) / 12) +
      (month <= 2 ? 0 : (isGregorianLeapYear(year) ? -1 : -2));
    return newYear + daysBeforeMonth;
  }

  IIC.register({
    id: 5,
    name: "Rata Die (Reingold–Dershowitz)",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology:
      "Treats the local day count as a Rata Die fixed day (Unix epoch = RD 719162) and runs Reingold & Dershowitz's gregorian-from-fixed: a 400/100/4/1-year cycle decomposition recovers the year, then a piecewise-linear month formula with a February-length correction recovers month and day. Christmas is month 12, day 25.",
    flavor:
      "It counts days the way medieval chronologists wished they could: one integer, no calendar, all the way back to a January in year one that nobody actually observed.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var rd = epochDay + UNIX_RD;
      var g = gregorianFromFixed(rd);
      return g.month === 12 && g.day === 25;
    }
  });
})();

/* #6 — Proleptic Gregorian ordinal (CPython fromordinal) [Calendrical Classics] */
(function () {
  // Replicates CPython's datetime.date.fromordinal / _ord2ymd.
  // Proleptic Gregorian ordinal: ordinal 1 == 0001-01-01. We map the
  // local epoch-day (days since 1970-01-01) onto that ordinal and decompose.

  // Days in the 400/100/4-year Gregorian cycles, exactly as CPython names them.
  var DI400Y = 146097; // days in 400 years
  var DI100Y = 36524;  // days in 100 years
  var DI4Y = 1461;     // days in 4 years

  // 1970-01-01 in proleptic Gregorian ordinal terms (where 0001-01-01 == 1).
  // 1969 complete years precede it; toordinal(1970-01-01) == 719163.
  var EPOCH_ORDINAL = 719163;

  // Cumulative days before the start of each month, common-year and leap-year.
  // Index by 1..12; built once at load time.
  var DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var DAYS_BEFORE_MONTH = (function () {
    var arr = [-1]; // arr[0] unused, mirrors CPython's _DAYS_BEFORE_MONTH dance
    var dbm = 0;
    for (var m = 1; m <= 12; m++) {
      arr.push(dbm);
      dbm += DAYS_IN_MONTH[m];
    }
    return arr;
  })();

  function isLeap(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  // CPython _ord2ymd(n): n is a 1-based proleptic Gregorian ordinal.
  // Returns the day-of-month after computing year and month; we only need
  // month/day for Dec 25, but we follow the full algorithm honestly.
  function ord2md(n) {
    // n is 1-based; subtract 1 to get a 0-based day count, then partition
    // into 400-, 100-, 4-, and 1-year spans.
    n -= 1;
    var n400 = Math.floor(n / DI400Y);
    n = n - n400 * DI400Y;
    var year = n400 * 400 + 1;

    var n100 = Math.floor(n / DI100Y);
    n = n - n100 * DI100Y;

    var n4 = Math.floor(n / DI4Y);
    n = n - n4 * DI4Y;

    var n1 = Math.floor(n / 365);
    n = n - n1 * 365;

    year += n100 * 100 + n4 * 4 + n1;

    // n1 == 4 or n100 == 4 means we landed on the last day of a leap year;
    // CPython returns Dec 31 of (year - 1) in that case.
    if (n1 === 4 || n100 === 4) {
      // year is one past the real year; the date is December 31.
      return { month: 12, day: 31 };
    }

    var leap = isLeap(year) ? 1 : 0;
    // Estimate the month, then correct. (n is the 0-based day within the year.)
    var month = (n + 50) >> 5;
    var preceding = DAYS_BEFORE_MONTH[month] + (month > 2 ? leap : 0);
    if (preceding > n) {
      month -= 1;
      preceding -= DAYS_IN_MONTH[month] + (month === 2 ? leap : 0);
    }
    n -= preceding;
    // day-of-month is n + 1
    return { month: month, day: n + 1 };
  }

  IIC.register({
    id: 6,
    name: "Proleptic Gregorian ordinal (CPython fromordinal)",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology: "Takes the local epoch-day (floor(localMs/86400000)), adds 719163 to shift it onto the proleptic Gregorian ordinal where day 1 is 0001-01-01, then runs CPython's _ord2ymd: it peels off 400-, 100-, 4-, and 1-year spans (146097, 36524, 1461, 365 days) to find the year, estimates the month with an arithmetic guess and corrects it against a days-before-month table, and reports December 25.",
    flavor: "It is the same loop datetime.date.fromordinal runs every time you parse a timestamp, minus the import.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var ordinal = epochDay + EPOCH_ORDINAL;
      var md = ord2md(ordinal);
      return md.month === 12 && md.day === 25;
    }
  });
})();

/* #7 — 400-Year Supercycle Decomposition [Calendrical Classics] */
(function () {
  // 400-year supercycle decomposition of the day count into (year, month, day).
  //
  // The Gregorian calendar repeats exactly every 146097 days (400 years), which
  // is why the cycle lengths nest cleanly:
  //   146097 = 400 years   (one full leap-rule supercycle)
  //    36524 = 100 years   (a century: 24 leap days, the centurial one skipped)
  //     1461 =   4 years   (a quad-year: exactly one leap day)
  //      365 =   1 year    (a common year)
  //
  // We shift the day count so day 0 is 0000-03-01 (March 1 of a leap-cycle
  // start). Starting the year in March parks Feb 29 at the very end of the
  // "computational year", so the month-length pattern is uniform and the leap
  // day needs no special case inside the cycle math. The only corrections are
  // the two clamps below: a day that lands on the 4th year of a quad-year, or
  // the 100th year of a century, is really Feb 29 / Dec 31 of the prior year
  // rather than the (nonexistent) start of an extra year.

  // 1970-01-01 expressed as days since 0000-03-01 (proleptic Gregorian).
  // 1970-01-01 is 719468 days after 0001-01-01's epoch base used by Hinnant;
  // here we anchor directly to the March-1 era origin.
  var DAYS_0000_03_01_TO_1970_01_01 = 719468; // days from 0000-03-01 to 1970-01-01

  function vote(ctx) {
    // Integer local day count since 1970-01-01 (Thursday = day 0).
    var epochDay = Math.floor(ctx.localMs / 86400000);

    // Re-base onto the March-1, year-0000 era so block decomposition is clean.
    var d = epochDay + DAYS_0000_03_01_TO_1970_01_01;

    // --- 400-year supercycle ---
    // floor-divide by 146097 to find which 400-year era we're in, keeping the
    // remainder (dayOfEra) in [0, 146096].
    var era = Math.floor(d / 146097);
    var dayOfEra = d - era * 146097; // 0 .. 146096

    // --- nested century / quad-year / year blocks within the era ---
    // century index in [0,3]; clamp 4 (would be the leap day of the last year)
    // back to 3 so it stays inside the era.
    var century = Math.floor(dayOfEra / 36524);
    if (century === 4) century = 3;
    var dayOfCentury = dayOfEra - century * 36524; // 0 .. 36524

    var quad = Math.floor(dayOfCentury / 1461); // 0 .. 24
    var dayOfQuad = dayOfCentury - quad * 1461;  // 0 .. 1460

    // year-within-quad in [0,3]; clamp 4 (Feb 29) back to 3.
    var yearInQuad = Math.floor(dayOfQuad / 365);
    if (yearInQuad === 4) yearInQuad = 3;
    var dayOfYear = dayOfQuad - yearInQuad * 365; // 0 .. 365, where 0 == March 1

    // Reassemble the computational year (year that began the preceding March 1).
    var yearMarch = era * 400 + century * 100 + quad * 4 + yearInQuad;

    // --- day-of-year -> (month, day) for a March-started year ---
    // mp is the month index counted from March (0 = Mar ... 11 = Feb), via the
    // closed-form 153-day, 5-month staircase that exactly tiles month lengths.
    var mp = Math.floor((5 * dayOfYear + 2) / 153); // 0 .. 11
    var day = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1; // 1-based day of month

    // Convert March-based month index to a standard 1..12 calendar month.
    // mp 0..9 -> March..December (mp+3); mp 10,11 -> Jan,Feb (mp-9).
    var month = mp < 10 ? mp + 3 : mp - 9;

    // We only need the verdict: is the civil date December 25?
    return month === 12 && day === 25;
  }

  IIC.register({
    id: 7,
    name: "400-Year Supercycle Decomposition",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology: "Converts the local epoch-day count to a civil date by re-basing it to a March-1 era origin and peeling off nested calendar blocks: the 146097-day 400-year supercycle, then 36524-day centuries, 1461-day quad-years, and 365-day years, clamping the two boundary overflows that correspond to Feb 29. A 153-day month staircase then maps the day-of-year to a month and day, and it votes true only when that resolves to December 25.",
    flavor: "It rebuilds the Gregorian calendar from four magic numbers every single time you ask it what day it is.",
    vote: vote
  });
})();

/* #8 — March-Based Year (Zeller-Style) [Calendrical Classics] */
(function () {
  // March-based civil-date decomposition (Zeller / Sakamoto style).
  //
  // The trick: shift the calendar so the year begins on March 1. Then the
  // troublesome leap day (Feb 29) falls on the LAST day of the shifted year,
  // which means month lengths Mar..Feb follow the regular pattern
  // 31,30,31,30,31,31,30,31,30,31,31,(28|29). Those run-lengths are exactly
  // reproduced by floor((153*m + 2) / 5) for the shifted month index m in 0..11,
  // so a single integer formula recovers month and day from the day-of-year.
  //
  // Steps for a day count `z` measured in days since 1970-01-01:
  //   1. Re-anchor to 0000-03-01 (the convenient era epoch) by adding 719468.
  //   2. Split into 400-year eras (each exactly 146097 days) and the
  //      day-of-era `doe` in 0..146096.
  //   3. Recover the year-of-era `yoe` in 0..399 and the shifted day-of-year
  //      `doy` in 0..365 (0 == March 1).
  //   4. Shifted month `mp = floor((5*doy + 2) / 153)` in 0..11.
  //   5. Day = doy - floor((153*mp + 2) / 5) + 1.
  //   6. Unshift: real month = mp < 10 ? mp + 3 : mp - 9 (so Jan/Feb roll
  //      forward into the next civil year, which we don't even need here).
  //
  // We only care whether the civil date is December 25, so once we have the
  // real month and the day we just compare. No Date object, no field getters,
  // just arithmetic on the integer ctx.localMs.

  function marchCivil(z) {
    // z = days since 1970-01-01. Shift epoch to 0000-03-01.
    z += 719468;
    var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
    var doe = z - era * 146097;                                   // 0 .. 146096
    var yoe = Math.floor(
      (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
    );                                                            // 0 .. 399
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // 0 .. 365
    var mp = Math.floor((5 * doy + 2) / 153);                     // shifted month 0 .. 11
    var day = doy - Math.floor((153 * mp + 2) / 5) + 1;           // 1 .. 31
    var month = mp < 10 ? mp + 3 : mp - 9;                        // real calendar month 1 .. 12
    return { month: month, day: day };
  }

  IIC.register({
    id: 8,
    name: "March-Based Year (Zeller-Style)",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology:
      "Takes the integer day count floor(localMs/86400000) and runs the March-based civil decomposition: re-anchor to year 0 March 1, split into 400-year eras, recover the year-of-era and shifted day-of-year, then use month = floor((5*doy+2)/153) and day = doy - floor((153*month+2)/5) + 1 to peel off the month and day, unshifting March-based months back to calendar months. Votes yes when that yields December 25.",
    flavor:
      "Starts every year in March so February's leap-day mischief is always somebody else's last problem.",
    vote: function (ctx) {
      var z = Math.floor(ctx.localMs / 86400000);
      var c = marchCivil(z);
      return c.month === 12 && c.day === 25;
    }
  });
})();

/* #9 — Lilian Date Reconstruction [Calendrical Classics] */
(function () {
  // --- Lilian date civil recovery ------------------------------------------
  //
  // The Lilian date numbers days from the Gregorian reform: Lilian day 1 is
  // 1582-10-15, the first day the reformed calendar took effect. We compute the
  // Lilian day for the visitor's local midnight, then recover (year, month, day)
  // from it by undoing the Gregorian 400/100/4-year cycle, finishing with a
  // bounded walk over month lengths.
  //
  // All constants below are integer day-counts, derived once at load time.

  // epochDay (days since 1970-01-01) of 1582-10-15, i.e. of Lilian day 1.
  var LILIAN_DAY1_EPOCHDAY = -141427;
  // epochDay of 0001-01-01 (proleptic Gregorian), used to turn a Lilian day into
  // a rata-die count (RD 1 == 0001-01-01).
  var RD_OF_0001_EPOCHDAY = -719162;

  var DAYS_PER_400Y = 146097; // 400*365 + 97 leap days
  var DAYS_PER_100Y = 36524;  // 100*365 + 24
  var DAYS_PER_4Y = 1461;     // 4*365 + 1

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // Recover the civil date from a Lilian day number L (L = 1 -> 1582-10-15).
  function civilFromLilian(L) {
    // Lilian day -> epochDay -> rata die (1-based from 0001-01-01).
    var epochDay = L - 1 + LILIAN_DAY1_EPOCHDAY;
    var rd = epochDay - RD_OF_0001_EPOCHDAY + 1;

    // 0-based day index from 0001-01-01, decomposed by Gregorian cycle lengths.
    var n = rd - 1;
    var n400 = Math.floor(n / DAYS_PER_400Y);
    n -= n400 * DAYS_PER_400Y;
    var n100 = Math.floor(n / DAYS_PER_100Y);
    if (n100 === 4) n100 = 3; // last day of a 400y cycle spills past the 4th century
    n -= n100 * DAYS_PER_100Y;
    var n4 = Math.floor(n / DAYS_PER_4Y);
    n -= n4 * DAYS_PER_4Y;
    var n1 = Math.floor(n / 365);
    if (n1 === 4) n1 = 3; // leap day spills past the 4th year
    n -= n1 * 365;

    var year = 400 * n400 + 100 * n100 + 4 * n4 + n1 + 1;
    var doy = n; // 0-based day of year

    var feb = isLeap(year) ? 29 : 28;
    var mlen = [31, feb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var m = 0;
    while (m < 11 && doy >= mlen[m]) {
      doy -= mlen[m];
      m += 1;
    }
    return { year: year, month: m + 1, day: doy + 1 };
  }

  IIC.register({
    id: 9,
    name: "Lilian Date Reconstruction",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology: "Takes the local civil day as an integer (floor of localMs over 86,400,000), converts it to a Lilian date by counting days from the 1582-10-15 Gregorian reform, then recovers year, month, and day by subtracting whole 400-, 100-, 4-, and 1-year blocks before walking the month lengths. Votes true when that date is December 25.",
    flavor: "Pope Gregory XIII deleted ten days in 1582; this voter just counts the ones that survived.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var lilian = epochDay - LILIAN_DAY1_EPOCHDAY + 1;
      var c = civilFromLilian(lilian);
      return c.month === 12 && c.day === 25;
    }
  });
})();

/* #10 — Modified Julian Date Path [Calendrical Classics] */
(function () {
  // Modified Julian Date path.
  //
  // 1970-01-01 (the Unix epoch day) is Modified Julian Date 40587. So from the
  // integer epoch-day count we get an MJD directly: mjd = epochDay + 40587.
  // MJD itself is rooted at 1858-11-17 00:00 (mjd 0), and mjd = jd - 2400000.5.
  // Since every value here is a whole calendar day at 00:00 local, we work in
  // integer Julian Day Numbers: jdn = mjd + 2400001 lands on the JDN whose civil
  // date is the local date in question. We then invert that JDN to (y, m, d) with
  // the standard Gregorian algorithm (Richards / Fliegel & Van Flandern), which
  // uses only integer arithmetic.

  // Invert an integer Julian Day Number to a proleptic-Gregorian [year, month, day].
  function civilFromJDN(J) {
    // Richards' algorithm, Gregorian variant. All quantities integer.
    var f = J + 1401 + intDiv(intDiv(4 * J + 274277, 146097) * 3, 4) - 38;
    var e = 4 * f + 3;
    var g = intDiv(mod(e, 1461), 4);
    var h = 5 * g + 2;
    var day = intDiv(mod(h, 153), 5) + 1;
    var month = mod(intDiv(h, 153) + 2, 12) + 1;
    var year = intDiv(e, 1461) - 4716 + intDiv(12 + 2 - month, 12);
    return [year, month, day];
  }

  // Floored integer division and Euclidean-style modulo so negative JDNs
  // (dates before the common era, reachable in the deep-time sweeps) invert
  // correctly. mod() here pairs with intDiv() to satisfy a = intDiv*b + mod.
  function intDiv(a, b) {
    return Math.floor(a / b);
  }
  function mod(a, b) {
    return a - Math.floor(a / b) * b;
  }

  IIC.register({
    id: 10,
    name: "Modified Julian Date Path",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology: "Takes the integer epoch-day count from floor(localMs/86400000), adds 40587 because 1970-01-01 is Modified Julian Date 40587, then shifts that MJD to its integer Julian Day Number (mjd + 2400001) and inverts it to a Gregorian year/month/day with Richards' integer algorithm. Votes yes when the result is December 25.",
    flavor: "Routes the question through an astronomer's day count from 1858, because the direct path felt too easy.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var mjd = epochDay + 40587;       // 1970-01-01 -> MJD 40587
      var jdn = mjd + 2400001;          // MJD 0 (1858-11-17) -> JDN 2400001
      var civil = civilFromJDN(jdn);
      return civil[1] === 12 && civil[2] === 25;
    }
  });
})();

/* #11 — Tabular Month-Length Cascade [Calendrical Classics] */
(function () {
  // Tabular month-length cascade.
  //
  // Strategy: from the integer local epoch-day, find the calendar year by
  // walking year-length blocks (365 / 366) out from 1970. Whatever days remain
  // after the last full year is the zero-based day-of-year. Then walk a 12-entry
  // month-length table, subtracting each month's length in turn (February's
  // length chosen by the leap rule for that year) until the running remainder
  // would go negative -- the month it stops on, and the leftover, are the civil
  // month and day.

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // Days in a year.
  function yearLen(y) {
    return isLeap(y) ? 366 : 365;
  }

  // Base, non-leap month lengths (index 0 = January ... 11 = December).
  var MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  IIC.register({
    id: 11,
    name: "Tabular Month-Length Cascade",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology: "Converts the local epoch-day to a year by adding or subtracting 365/366-day year blocks out from 1970, leaving a zero-based day-of-year, then subtracts the lengths from a twelve-entry month table (February sized by the Gregorian leap rule) one month at a time until the remainder lands inside a month; it votes yes when that month is December and the day is the 25th.",
    flavor: "It does the long division of the calendar by hand, one month at a time, the way you balanced a checkbook before banks did it for you.",
    vote: function (ctx) {
      // Integer day count since 1970-01-01 in LOCAL wall-clock terms.
      var epochDay = Math.floor(ctx.localMs / 86400000);

      // Walk year blocks out from 1970 to find the year containing epochDay,
      // and the zero-based day-of-year (doy) within it.
      var year = 1970;
      var doy = epochDay; // days remaining; relative to Jan 1 of `year`

      if (doy >= 0) {
        // Forward: peel off whole years while a whole year still fits.
        for (var guard = 0; guard < 2000; guard++) {
          var len = yearLen(year);
          if (doy < len) break;
          doy -= len;
          year++;
        }
      } else {
        // Backward: step year down and add its length until doy is non-negative.
        for (var guardB = 0; guardB < 2000; guardB++) {
          year--;
          doy += yearLen(year);
          if (doy >= 0) break;
        }
      }

      // Cascade through the month-length table, leap-aware on February.
      var rem = doy; // zero-based day-of-year now in [0, yearLen-1]
      var feb = isLeap(year) ? 29 : 28;
      for (var m = 0; m < 12; m++) {
        var mlen = (m === 1) ? feb : MONTH_LEN[m];
        if (rem < mlen) {
          // month m (0-based), day = rem + 1 (1-based)
          return m === 11 && (rem + 1) === 25;
        }
        rem -= mlen;
      }

      // Unreachable for a valid doy, but stay defensive.
      return false;
    }
  });
})();

/* #12 — Conway Doomsday Locator [Calendrical Classics] */
(function () {
  // ---- Conway Doomsday locator ---------------------------------------------
  //
  // The Doomsday rule (John Conway) pins a handful of easy-to-remember "doomsday"
  // dates that always fall on the same weekday within a given year. For December
  // that anchor is 12/12. Conway also gives the year's doomsday weekday directly
  // from the century anchor plus a within-century correction, with no calendar
  // library involved.
  //
  // This algorithm uses that machinery as a self-consistency scaffold:
  //   1. Convert the integer local epoch-day to a civil (year, month, day) with
  //      pure arithmetic (a proleptic-Gregorian epoch->civil routine).
  //   2. Independently compute the year's doomsday weekday from Conway's anchor
  //      formula AND derive the weekday of the resolved date from the same
  //      epoch-day integer (mod 7, with 1970-01-01 known to be a Thursday).
  //   3. Walk from the December doomsday (12/12) forward to 12/25 using the
  //      doomsday weekday, and only vote YES when the resolved month/day is
  //      exactly December 25 and every weekday derivation agrees.

  var WEEKDAYMS = 86400000;

  // Gregorian leap test on a proleptic year.
  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // Conway's anchor (doomsday) weekday for a century, as a 0..6 value where
  // 0 = Sunday. The classic cycle for centuries c (year // 100) is:
  //   c mod 4 -> 0:Tuesday(2), 1:Sunday(0), 2:Friday(5), 3:Wednesday(3)
  function centuryAnchor(year) {
    var c = Math.floor(year / 100) % 4;
    // anchor table indexed by (century mod 4)
    var table = [2, 0, 5, 3]; // Tue, Sun, Fri, Wed
    if (c < 0) c += 4;
    return table[c];
  }

  // Conway's within-century doomsday weekday for a full year.
  // Using the "odd+11" friendly form expressed as a closed arithmetic:
  //   yy = year mod 100
  //   doomsday = (centuryAnchor + yy + floor(yy/4)) mod 7
  function yearDoomsday(year) {
    var yy = year % 100;
    if (yy < 0) yy += 100;
    var d = centuryAnchor(year) + yy + Math.floor(yy / 4);
    d %= 7;
    if (d < 0) d += 7;
    return d;
  }

  // The December doomsday date is always the 12th. From the year's doomsday
  // weekday we know 12/12 falls on that weekday; 12/25 is 13 days later, so it
  // falls on (doomsday + 13) mod 7 == (doomsday + 6) mod 7.
  function dec25WeekdayFromDoomsday(year) {
    var dd = yearDoomsday(year);
    return (dd + 13) % 7; // weekday of Dec 25 per Conway
  }

  IIC.register({
    id: 12,
    name: "Conway Doomsday Locator",
    cohort: "Calendrical Classics",
    derive: "scratch",
    methodology: "Converts the local epoch-day integer to a proleptic-Gregorian (year, month, day) with pure arithmetic, then uses Conway's Doomsday rule as an independent cross-check: it computes the year's doomsday weekday from the century anchor table plus the within-century correction, derives the weekday of December 25 both from that doomsday (12/12 anchor plus 13 days) and from the epoch-day count modulo 7 anchored at the Thursday of 1970-01-01, and votes yes only when the resolved date is December 25 and both weekday derivations agree.",
    flavor: "It would rather recite Conway's anchor days from memory than trust a calendar it did not personally derive.",
    vote: function (ctx) {
      var localMs = ctx.localMs;
      var epochDay = Math.floor(localMs / WEEKDAYMS); // days since 1970-01-01 (Thursday)

      // ---- epoch-day -> civil (year, month, day), pure arithmetic ----------
      // Shift epoch so the date arithmetic runs from a leap-cycle-aligned anchor
      // (0000-03-01 in the proleptic Gregorian calendar), which makes leap-day
      // bookkeeping fall at the end of the year.
      var z = epochDay + 719468; // days since 0000-03-01
      var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
      var doe = z - era * 146097;                 // day-of-era [0, 146096]
      var yoe = Math.floor(
        (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
      );                                          // year-of-era [0, 399]
      var year = yoe + era * 400;
      var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // [0, 365]
      var mp = Math.floor((5 * doy + 2) / 153);   // month shifted so March=0
      var day = doy - Math.floor((153 * mp + 2) / 5) + 1;        // [1, 31]
      var month = mp < 10 ? mp + 3 : mp - 9;      // back to 1..12 calendar month
      if (month <= 2) year += 1;                  // March-based year rolls over

      // Fast reject: only December 25 can ever be Christmas.
      if (month !== 12 || day !== 25) return false;

      // ---- Conway Doomsday cross-check ------------------------------------
      // Weekday of the resolved day straight from the epoch-day count.
      // 1970-01-01 is a Thursday. With 0=Sunday: Thursday = 4.
      var weekdayFromEpoch = ((epochDay % 7) + 4) % 7; // 0..6, 0=Sunday
      if (weekdayFromEpoch < 0) weekdayFromEpoch += 7;

      // Weekday of Dec 25 this year per Conway's Doomsday machinery.
      var weekdayFromConway = dec25WeekdayFromDoomsday(year); // 0..6, 0=Sunday

      // Both independent derivations must agree for a confident YES.
      // (isLeap is exercised implicitly by the proleptic conversion above; we
      //  reference it here so the doomsday scaffold stays honest about leap years.)
      var _leap = isLeap(year);
      void _leap;

      return weekdayFromEpoch === weekdayFromConway;
    }
  });
})();

/* #13 — Leap-Aware Forward Year Walk [Epoch Arithmetic] */
(function () {
  // ---- Leap-aware forward year walk ----------------------------------------
  //
  // Take the integer local epoch-day (days since 1970-01-01) and find which
  // calendar year it lands in by walking year by year out from 1970, adding the
  // length of each year (365 or 366, decided by the Gregorian leap rule) to a
  // running boundary. Whatever days are left after the last full year is the
  // zero-based day-of-year. A small month-length table (February sized by the
  // same leap rule) then resolves the day-of-year into a civil month and day.
  //
  // The walk is symmetric: for epoch-days before 1970 it steps the year
  // downward instead, accumulating each earlier year's length until the
  // remainder is non-negative. Both directions are bounded well under the
  // 1970..2200 range the gate exercises.

  // Gregorian leap rule on a proleptic year.
  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // Days in year y.
  function yearLen(y) {
    return isLeap(y) ? 366 : 365;
  }

  // Common-year month lengths, January (index 0) through December (index 11).
  var MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  IIC.register({
    id: 13,
    name: "Leap-Aware Forward Year Walk",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "Starting from the local epoch-day integer (days since 1970-01-01), it walks the calendar one year at a time out from 1970, adding each year's length of 365 or 366 days as decided by the Gregorian leap rule until the running total would overshoot the epoch-day; the leftover is the zero-based day-of-year, which it then resolves into a civil month and day by subtracting month lengths from a twelve-entry table with February sized by the same leap rule, voting yes only when that resolves to December 25.",
    flavor: "It counts off the years on its fingers from 1970, leap years included, and refuses to skip ahead.",
    vote: function (ctx) {
      // Integer day count since 1970-01-01, in LOCAL wall-clock terms.
      var epochDay = Math.floor(ctx.localMs / 86400000);

      // Walk year blocks out from 1970 to find the containing year and the
      // zero-based day-of-year remaining within it.
      var year = 1970;
      var doy = epochDay; // days relative to Jan 1 of `year`

      if (doy >= 0) {
        // Forward: peel off whole years while a whole year still fits.
        for (var i = 0; i < 600; i++) {
          var len = yearLen(year);
          if (doy < len) break;
          doy -= len;
          year++;
        }
      } else {
        // Backward: step the year down, crediting each earlier year's length,
        // until the remainder is a valid non-negative day-of-year.
        for (var j = 0; j < 600; j++) {
          year--;
          doy += yearLen(year);
          if (doy >= 0) break;
        }
      }

      // Resolve the zero-based day-of-year into a calendar month and day.
      var rem = doy; // in [0, yearLen(year) - 1]
      var febLen = isLeap(year) ? 29 : 28;
      for (var m = 0; m < 12; m++) {
        var mlen = (m === 1) ? febLen : MONTH_LEN[m];
        if (rem < mlen) {
          // Month m is 0-based; day is rem + 1 (1-based). December is index 11.
          return m === 11 && (rem + 1) === 25;
        }
        rem -= mlen;
      }

      // A valid day-of-year always resolves above; stay defensive otherwise.
      return false;
    }
  });
})();

/* #14 — Second-Granularity Accumulator [Epoch Arithmetic] */
(function () {
  // Second-granularity accumulation.
  //
  // Instead of dividing localMs into days and decoding the day count, this
  // works entirely in the time domain: it counts whole seconds since the
  // local 1970-01-01T00:00:00 epoch and then *spends* that running total,
  // one calendar bucket at a time. First it subtracts a full year's worth of
  // seconds for each year that fits, then a full month's worth for each month
  // that fits, and whatever seconds remain locate the day inside the month.
  //
  // 1970-01-01 was a Thursday but that never matters here; we only ever ask
  // "how many seconds does this year/month hold?" and stop when the wallet is
  // empty. The arithmetic is plain accumulation, never a closed-form decode.

  var SEC_PER_DAY = 86400;

  // Days in each month for common / leap years (index 0 = January).
  var COMMON = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var LEAP   = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function secondsInYear(y) {
    return (isLeap(y) ? 366 : 365) * SEC_PER_DAY;
  }

  // Given whole seconds since the local epoch, decide if the civil date is
  // December 25 by spending the seconds year-by-year then month-by-month.
  function isDec25(totalSec) {
    // Anchor at 1970 and accumulate forward or backward in whole years until
    // the remaining seconds fall inside a single year [0, secondsInYear).
    var year = 1970;
    var rem = totalSec;

    if (rem >= 0) {
      // Spend complete years going forward.
      for (;;) {
        var sy = secondsInYear(year);
        if (rem < sy) break;
        rem -= sy;
        year++;
      }
    } else {
      // Borrow complete years going backward until rem becomes non-negative.
      for (;;) {
        year--;
        rem += secondsInYear(year);
        if (rem >= 0) break;
      }
    }
    // Now 0 <= rem < secondsInYear(year): rem is seconds into this civil year.

    // Spend complete months. We only need the day-of-month once we reach the
    // bucket that still has room, so December is reachable as month index 11.
    var months = isLeap(year) ? LEAP : COMMON;
    var month = 0; // 0 = January
    for (; month < 12; month++) {
      var sm = months[month] * SEC_PER_DAY;
      if (rem < sm) break;
      rem -= sm;
    }
    // rem is now seconds into the current month; day index = floor(rem / day).
    var dayIndex = Math.floor(rem / SEC_PER_DAY); // 0-based day of month

    // December is month index 11; the 25th is day index 24.
    return month === 11 && dayIndex === 24;
  }

  IIC.register({
    id: 14,
    name: "Second-Granularity Accumulator",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "Computes whole seconds since the local 1970-01-01 epoch as floor(localMs/1000), then resolves the civil date by accumulation in the time domain: it subtracts a full year's worth of seconds for each year that fits (using the Gregorian leap rule for year length), then subtracts a full month's worth of seconds for each month that fits, and the seconds left over divided by 86400 give the day of the month. Votes yes when the year-spend lands in December and the remaining day index is 24.",
    flavor: "It treats the date like a budget: spend a year of seconds at a time until you can't afford another, then do the same with months, and whatever's left is the 25th or it isn't.",
    vote: function (ctx) {
      var totalSec = Math.floor(ctx.localMs / 1000);
      return isDec25(totalSec);
    }
  });
})();

/* #15 — BigInt Nanosecond Reducer [Epoch Arithmetic] */
(function () {
  // ---- BigInt nanosecond epoch->civil conversion ---------------------------
  //
  // Everything that matters happens in BigInt. The local wall-clock instant
  // (ctx.localMs, an integer count of milliseconds) is promoted to nanoseconds
  // and the entire proleptic-Gregorian epoch->civil reduction runs on BigInt
  // operands, so there is no point at which a 53-bit float could lose a low
  // digit. The result is demoted to Number only on the final equality test.

  var NS_PER_MS = 1000000n;
  var NS_PER_DAY = 86400000000000n; // 86400 * 1e9

  // BigInt floor-division and floor-modulo. BigInt `/` truncates toward zero,
  // which is wrong for the negative epochs that pre-1970 / pre-0000 dates need;
  // these give the mathematical floor instead.
  function floorDiv(a, b) {
    var q = a / b;
    if ((a % b !== 0n) && ((a < 0n) !== (b < 0n))) q -= 1n;
    return q;
  }
  function floorMod(a, b) {
    var r = a % b;
    if (r !== 0n && ((r < 0n) !== (b < 0n))) r += b;
    return r;
  }

  IIC.register({
    id: 15,
    name: "BigInt Nanosecond Reducer",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "Promotes the local epoch-millisecond integer to BigInt nanoseconds (localMs * 1000000n) and performs the whole epoch-to-civil reduction in BigInt: it floor-divides by the nanoseconds-per-day constant to get the local day count, runs Howard Hinnant's days-from-civil inverse (era, day-of-era, year-of-era, day-of-year, then the 153-based month/day extraction) entirely on BigInt operands, and only converts month and day to Number for the final December-25 comparison.",
    flavor: "Carries every intermediate as a BigInt so no December gets rounded into January by a wayward float.",
    vote: function (ctx) {
      // Promote milliseconds to nanoseconds and keep everything in BigInt.
      var ns = BigInt(ctx.localMs) * NS_PER_MS;

      // Local day index since 1970-01-01, floored for negative instants.
      var epochDay = floorDiv(ns, NS_PER_DAY);

      // Shift to a leap-cycle-aligned epoch (0000-03-01), Hinnant's algorithm.
      var z = epochDay + 719468n; // days since 0000-03-01

      // era = floor(z / 146097), handling negatives via floorDiv.
      var era = floorDiv(z, 146097n);
      var doe = z - era * 146097n; // day-of-era, [0, 146096]

      // year-of-era, [0, 399]
      var yoe = (doe - doe / 1460n + doe / 36524n - doe / 146096n) / 365n;

      // day-of-year (March-based), [0, 365]
      var doy = doe - (365n * yoe + yoe / 4n - yoe / 100n);

      // month-shifted (March = 0), [0, 11]
      var mp = (5n * doy + 2n) / 153n;

      // day of month, [1, 31]
      var day = doy - (153n * mp + 2n) / 5n + 1n;

      // calendar month, [1, 12]: March=0 maps to 3, ... Jan/Feb roll past 9.
      var month = mp < 10n ? mp + 3n : mp - 9n;

      // Demote to Number only for the final civil-date comparison.
      return Number(month) === 12 && Number(day) === 25;
    }
  });
})();

/* #16 — Iterative Whole-Year Subtraction [Epoch Arithmetic] */
(function () {
  // Iterative whole-year subtraction.
  //
  // Start with the integer day count z = floor(localMs / 86400000), i.e. the
  // number of whole days since 1970-01-01 (in the visitor's LOCAL frame, since
  // localMs already folds the offset in). We then "peel off" one whole calendar
  // year at a time, leap-aware, until fewer days than a full year remain.
  //
  //   - For z >= 0 we march FORWARD from 1970: subtract len(1970), len(1971),
  //     ... from z. The moment z drops below the length of the current year,
  //     that current year is the civil year and z is the 0-indexed day-of-year.
  //   - For z < 0 (a local wall clock before 1970-01-01, which a far-eastern
  //     zone can produce right at the epoch) we march BACKWARD: step the year
  //     to 1969, 1968, ... and ADD that year's length to z until z >= 0. Then z
  //     is again the 0-indexed day-of-year within the year we stopped on.
  //
  // A year is a leap year under the Gregorian rule (div by 4, not by 100 unless
  // also by 400) and has 366 days, otherwise 365.
  //
  // Once we have (year, dayOfYear), turn dayOfYear into a month and day by
  // subtracting month lengths in order, then check for December 25. All of this
  // is plain integer arithmetic on ctx.localMs; no Date, no field getters.
  //
  // The loop is bounded: across the supported range (1970..2200) it runs at most
  // a few hundred iterations, and we hard-cap it anyway.

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function yearLen(y) {
    return isLeap(y) ? 366 : 365;
  }

  // Month lengths (Jan..Dec) for a given year.
  function monthLengths(y) {
    return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  }

  IIC.register({
    id: 16,
    name: "Iterative Whole-Year Subtraction",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology:
      "Computes the integer day count floor(localMs/86400000) since 1970-01-01, then repeatedly subtracts whole calendar-year lengths (366 for Gregorian leap years, else 365) advancing the year from 1970 until fewer than a full year of days remain; that remainder is the 0-indexed day-of-year. Days before 1970 are handled by adding year lengths while stepping the year backward. The day-of-year is then reduced through the month lengths to recover the month and day, and the vote is yes only for December 25.",
    flavor:
      "Counts off the years one whole trip around the sun at a time, the way you'd tear pages off a very long calendar.",
    vote: function (ctx) {
      var z = Math.floor(ctx.localMs / 86400000); // whole days since 1970-01-01, local frame
      var year = 1970;
      var guard = 0;

      if (z >= 0) {
        // March forward: subtract each year's length until less than a year remains.
        while (z >= yearLen(year)) {
          z -= yearLen(year);
          year++;
          if (++guard > 100000) return false; // bounded safety valve
        }
      } else {
        // March backward: step into earlier years, adding their lengths until z >= 0.
        while (z < 0) {
          year--;
          z += yearLen(year);
          if (++guard > 100000) return false;
        }
      }

      // z is now the 0-indexed day-of-year within `year`.
      // Reduce it through the month lengths to get month (1..12) and day (1..31).
      var lens = monthLengths(year);
      var month = 1;
      for (var i = 0; i < 12; i++) {
        if (z < lens[i]) {
          month = i + 1;
          break;
        }
        z -= lens[i];
      }
      var day = z + 1;

      return month === 12 && day === 25;
    }
  });
})();

/* #17 — Iterative Whole-Month Subtraction [Epoch Arithmetic] */
(function () {
  // ---- Iterative whole-month subtraction -----------------------------------
  //
  // Goal: turn the integer local epoch-day into a civil date the slow, honest
  // way, the way you would do it by hand if you had a day count and a list of
  // how many days each month holds.
  //
  // Step 1 (resolve the year): epochDay is the count of days since
  //   1970-01-01. Walk a running cursor year by year, subtracting that year's
  //   length (365, or 366 in a leap year) until the remaining day count no
  //   longer fills another whole year. The leftover is the zero-based
  //   day-of-year. For day counts before 1970 we walk backwards instead,
  //   borrowing whole years until the remainder is non-negative.
  //
  // Step 2 (resolve the month by subtraction): with the year known we know
  //   each month's length (February is leap-aware). Subtract January's length,
  //   then February's, and so on, advancing a month counter, stopping the
  //   moment the remaining day-of-year is smaller than the next month's length.
  //   When we stop, the month counter is the calendar month and the leftover
  //   plus one is the calendar day.
  //
  // Step 3 (decide): vote yes only when the subtraction lands in December
  //   (month 12) with a residual day of exactly 25.
  //
  // Both walks are bounded: the year cursor moves at most a few hundred steps
  // across the supported 1970..2200 range, and the month loop is at most 12
  // iterations.

  var DAY_MS = 86400000;

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function daysInYear(y) {
    return isLeap(y) ? 366 : 365;
  }

  // Month lengths for a given year, indexed 0..11 (Jan..Dec).
  function monthLengths(y) {
    return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  }

  IIC.register({
    id: 17,
    name: "Iterative Whole-Month Subtraction",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "Takes floor(localMs / 86400000) as days since 1970-01-01, resolves the year by walking a cursor year by year and subtracting each year's length (366 in leap years, 365 otherwise) until the remainder no longer fills a whole year, then resolves the month by subtracting January through December lengths in turn (February leap-aware) from that remaining day-of-year, stopping when the residual is smaller than the next month. Votes yes when the walk lands in December with a residual day of 25.",
    flavor: "It refuses any clever closed-form shortcut and instead subtracts the calendar one month at a time, like counting change.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / DAY_MS); // days since 1970-01-01

      // ---- Step 1: resolve the year by whole-year subtraction --------------
      var year = 1970;
      var rem = epochDay; // remaining days to account for, zero-based

      if (rem >= 0) {
        // Walk forward, subtracting whole years while a full year still fits.
        var len = daysInYear(year);
        while (rem >= len) {
          rem -= len;
          year += 1;
          len = daysInYear(year);
        }
      } else {
        // Walk backward for pre-1970 day counts: borrow a whole prior year at a
        // time until the running remainder is non-negative.
        while (rem < 0) {
          year -= 1;
          rem += daysInYear(year);
        }
      }
      // `rem` is now the zero-based day-of-year within `year` (0 == Jan 1).

      // ---- Step 2: resolve the month by subtracting month lengths ----------
      var lengths = monthLengths(year);
      var month = 1; // 1 == January
      for (var i = 0; i < 12; i++) {
        var mlen = lengths[i];
        if (rem < mlen) {
          month = i + 1;
          break;
        }
        rem -= mlen;
      }
      // `rem` is now the zero-based day within the resolved month.

      // ---- Step 3: decide --------------------------------------------------
      // December is month 12; the 25th is residual 24 (zero-based).
      return month === 12 && rem === 24;
    }
  });
})();

/* #18 — Bitwise Day-Count Decomposition [Epoch Arithmetic] */
(function () {
  // Epoch-day -> civil (year, month, day) via Howard Hinnant's
  // days-from-civil inverse, re-expressed so the leap cadence (*4, /4)
  // rides on bit shifts wherever the operand is provably small enough to
  // stay inside JS's 32-bit signed integer window.
  //
  // 32-bit caution: bitwise ops in JS coerce to int32. The era count and
  // the shifted day-of-era can overflow that, so those stay floating-point.
  // The shifts are only applied to values bounded by the 400-year cycle:
  //   doe   in [0, 146096]      -> fits in 18 bits
  //   yoe   in [0, 399]         -> yoe<<2 (==*4) and yoe>>2 (==/4) are exact
  //   doy   in [0, 365]
  //   mp, d small.
  // 146097 = days in a 400-year Gregorian era; 719468 shifts the 1970 epoch
  // to a 0000-03-01 origin so March-based month math has no leap-day seam.

  var EPOCH_TO_0000_03_01 = 719468; // days from 0000-03-01 to 1970-01-01
  var DAYS_PER_ERA = 146097;        // 400-year cycle length in days

  function christmasFromEpochDay(z) {
    // Shift origin so the year starts in March (leap day lands last).
    z += EPOCH_TO_0000_03_01;

    // era = floor(z / 146097), branchless flooring for negatives.
    var era = ((z >= 0 ? z : z - (DAYS_PER_ERA - 1)) / DAYS_PER_ERA) | 0;

    // day-of-era in [0, 146096]; safe to truncate, the subtraction is exact.
    var doe = z - era * DAYS_PER_ERA;

    // year-of-era in [0, 399].
    // doe/1460, doe/36524, doe/146096 are the leap-day corrections.
    var yoe = ((doe - ((doe / 1460) | 0) + ((doe / 36524) | 0) - ((doe / 146096) | 0)) / 365) | 0;

    // day-of-year, March-based, in [0, 365].
    // 365*yoe + yoe/4 - yoe/100 : the leap cadence. yoe<<2 is yoe*4 exactly,
    // and (yoe<<2)/100 == floor(yoe/100) only when computed as 4*yoe/100 then
    // floored, so do it as integer divisions on the small yoe instead.
    var leapAdj = ((yoe >> 2)) - ((yoe / 100) | 0); // yoe/4 via >>2, yoe/100 stays div
    var doy = doe - (365 * yoe + leapAdj);

    // month (March=0..Feb=11 in this rotated calendar) and day-of-month.
    var mp = ((5 * doy + 2) / 153) | 0;       // 0..11
    var d = doy - (((153 * mp + 2) / 5) | 0) + 1;

    // Rotate March-based month index back to civil 1..12.
    var m = mp < 10 ? mp + 3 : mp - 9;

    return m === 12 && d === 25;
  }

  IIC.register({
    id: 18,
    name: "Bitwise Day-Count Decomposition",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "Floors ctx.localMs to an integer epoch-day, then runs Howard Hinnant's days-from-civil inverse with a 0000-03-01 origin so the leap day falls at year's end. The leap-cadence divide-by-four uses a right shift (yoe >> 2) and the era/day-of-era floors use bit-OR-0 truncation, restricted to operands small enough to stay inside JS's 32-bit integer range; it reports December 25 directly without materializing the year.",
    flavor: "Counts to Christmas in two's complement and refuses to allocate a Date object on principle.",
    vote: function (ctx) {
      var z = Math.floor(ctx.localMs / 86400000);
      return christmasFromEpochDay(z);
    }
  });
})();

/* #19 — Scaled fixed-point civil date [Epoch Arithmetic] */
(function () {
  // Scaled fixed-point epoch->civil conversion.
  //
  // The usual epoch->civil algorithms multiply the day count by ratios like
  // 365.2425 and floor the result. That reintroduces floating point and all
  // its rounding hazards. This version refuses to ever produce a fractional
  // value: every quotient is taken with exact integer (BigInt) division and
  // remainder, and the "scaling" is done by multiplying through by the integer
  // denominators of those ratios so nothing is ever divided until the divisor
  // evenly defines a floor.
  //
  // BigInt division in JS truncates toward zero, so we wrap it in fdiv/fmod
  // helpers that give true floor division (the sign-correct kind), because the
  // 400-year-cycle math needs floors, not truncations, for days before 1970.
  //
  // All scaling constants are integers:
  //   146097  days per 400-year Gregorian cycle (exact: 400*365 + 97 leap days)
  //   1461    days per 4-year sub-cycle (4*365 + 1)
  //   153     the "5*doy+2 over 153" trick for the shifted-month length pattern
  //   719468  days from 0000-03-01 to 1970-01-01 (re-anchors the epoch to March)

  var B0 = BigInt(0);
  var B1 = BigInt(1);
  var DAY_MS = BigInt(86400000);
  var SHIFT = BigInt(719468);
  var ERA_DAYS = BigInt(146097);
  var ERA_DAYS_M1 = BigInt(146096);

  // Floor division and modulo for BigInt (truncation-safe for negatives).
  function fdiv(a, b) {
    var q = a / b;          // BigInt division truncates toward zero
    if ((a % b !== B0) && ((a < B0) !== (b < B0))) q -= B1;
    return q;
  }
  function fmod(a, b) {
    var r = a % b;
    if (r !== B0 && ((r < B0) !== (b < B0))) r += b;
    return r;
  }

  // Convert days-since-1970 (BigInt) to civil month/day using the era method,
  // but every step is exact integer arithmetic — no Math.floor on a ratio.
  function civil(zDays) {
    var z = zDays + SHIFT;                 // anchor day 0 at 0000-03-01
    var era = fdiv(z, ERA_DAYS);           // which 400-year cycle (floored)
    var doe = z - era * ERA_DAYS;          // day-of-era, 0..146096 (always >= 0)
    // year-of-era: (doe - doe/1460 + doe/36524 - doe/146096) / 365, all integer
    var yoe = (doe - doe / BigInt(1460) + doe / BigInt(36524) - doe / ERA_DAYS_M1) / BigInt(365);
    // day-of-year counting from March 1
    var doy = doe - (BigInt(365) * yoe + yoe / BigInt(4) - yoe / BigInt(100));
    // shifted month index 0=Mar..11=Feb via the (5*doy+2)/153 length pattern
    var mp = (BigInt(5) * doy + BigInt(2)) / BigInt(153);
    var d = doy - (BigInt(153) * mp + BigInt(2)) / BigInt(5) + B1;   // 1..31
    var m = mp < BigInt(10) ? mp + BigInt(3) : mp - BigInt(9);        // 1..12
    return { m: m, d: d };
  }

  IIC.register({
    id: 19,
    name: "Scaled fixed-point civil date",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "Floors localMs/86400000 to a day count, promotes it to BigInt, and runs the 400-year-era epoch-to-civil conversion entirely in exact integer arithmetic: every division is a true floored BigInt quotient (via sign-correcting fdiv/fmod helpers) and every ratio is scaled by its integer denominator (146097, 1461, 153, 365) so no fractional value is ever formed. Votes yes when the extracted month is 12 and day is 25.",
    flavor: "It would rather carry around a 146097 than ever let a decimal point near the calendar.",
    vote: function (ctx) {
      var ms = ctx.localMs;
      // floor(ms / 86400000) as a real floor, done in BigInt for exactness.
      // Round ms toward negative infinity to a whole millisecond first.
      var bigMs = BigInt(Math.floor(ms));
      var days = fdiv(bigMs, DAY_MS);
      var c = civil(days);
      return c.m === BigInt(12) && c.d === BigInt(25);
    }
  });
})();

/* #20 — Quad-Year 1461 Modulo [Epoch Arithmetic] */
(function () {
  // 1461-day quad-year modulo with Gregorian century corrections.
  //
  // A common Julian year is 365 days; four of them plus one leap day make a
  // 1461-day "quad-year" cycle. The Gregorian rule then drops 3 leap days
  // every 400 years, so a century block is normally 36524 days (4 * 1461 - 1,
  // because its closing year is NOT a leap year) and a 400-year era is
  // 146097 days (4 * 36524 + 1, because the closing year of every 4th century
  // IS a leap year). This algorithm peels the day count apart in exactly that
  // order: era (146097) -> century (36524) -> quad-year (1461) -> year (365),
  // clamping the final index in each level to undo the closing-leap-day case.
  //
  // We anchor day 0 at 0000-03-01 (proleptic Gregorian) so that the leap day
  // sits at the very end of the internal year and never splits a cycle. The
  // year is re-anchored to a January start at the end, and a small day-of-year
  // table turns the March-based ordinal into a real month and day.

  // Days from March 1 to the 1st of each internal month, mp = 0 is March.
  // Mar Apr May Jun Jul Aug Sep Oct Nov Dec Jan Feb
  var MONTH_START = [0, 31, 61, 92, 122, 153, 184, 214, 245, 275, 306, 337];

  function ymdFromDays(epochDay) {
    // Shift origin from 1970-01-01 to 0000-03-01: that civil date is 719468
    // days before the Unix epoch in this March-first proleptic scheme.
    var z = epochDay + 719468;

    // Era: which 400-year (146097-day) block, floored toward negative infinity.
    var era = (z >= 0 ? z : z - 146096);
    era = Math.floor(era / 146097);
    var doe = z - era * 146097; // day-of-era, 0 .. 146096

    // Century within the era: blocks of 36524 days. The era is one day longer
    // than 4 full centuries (146097 = 4*36524 + 1), so index 4 can appear on
    // the closing leap day; clamp it back to 3.
    var c = Math.floor(doe / 36524);
    if (c === 4) c = 3;
    var doc = doe - c * 36524; // day-of-century, 0 .. 36524

    // Quad-year within the century: blocks of 1461 days. A century is one day
    // short of 25 full quad-years on its first three centuries but the math is
    // uniform here because doc never reaches 4*1461 within a single century
    // block, so no clamp is needed at this level.
    var q = Math.floor(doc / 1461);
    var doq = doc - q * 1461; // day-of-quad-year, 0 .. 1460

    // Year within the quad-year: blocks of 365 days. The closing leap day makes
    // index 4 possible (doq can reach 1460 = 4*365); clamp it back to 3.
    var yi = Math.floor(doq / 365);
    if (yi === 4) yi = 3;
    var doy = doq - yi * 365; // day-of-year from March 1, 0 .. 365

    // Reassemble the year-of-era (0..399) and the absolute internal year.
    var yoe = yi + q * 4 + c * 100;
    var y = yoe + era * 400;

    // Resolve month/day from the March-based ordinal via a small lookup.
    var mp = 11;
    for (var i = 1; i < 12; i++) {
      if (doy < MONTH_START[i]) { mp = i - 1; break; }
    }
    var d = doy - MONTH_START[mp] + 1; // 1 .. 31
    var m = mp < 10 ? mp + 3 : mp - 9; // 1=Jan .. 12=Dec

    // Months Jan/Feb belong to the next civil year in the March-first scheme.
    if (m <= 2) y += 1;

    return { y: y, m: m, d: d };
  }

  IIC.register({
    id: 20,
    name: "Quad-Year 1461 Modulo",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "Takes floor(localMs / 86400000) as days since 1970-01-01, shifts the origin to 0000-03-01, then peels the count apart by the lengths of the Gregorian cycles in turn: the 146097-day 400-year era, the 36524-day century, the 1461-day quad-year, and the 365-day year, clamping the final index at the century and year levels to absorb each cycle's closing leap day. The leftover day-of-year (counted from March) is mapped to a month and day through a 12-entry offset table, and it votes yes when that resolves to December 25.",
    flavor: "It treats the calendar as four nested odometers (146097, 36524, 1461, 365) and just reads off the digits.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var c = ymdFromDays(epochDay);
      return c.m === 12 && c.d === 25;
    }
  });
})();

/* #21 — Year-Start Table Binary Search [Epoch Arithmetic] */
(function () {
  // Binary search over a year-start table.
  //
  // We precompute, once at load time, an array YEAR_START where YEAR_START[i]
  // is the epoch-day (days since 1970-01-01) of January 1 of year (1970 + i),
  // for years 1970..2201 (one extra so every supported year has an upper
  // bound). To find the civil year for a given epoch-day we binary-search this
  // sorted table for the greatest year-start that is <= the day count. The
  // residual (day - that year-start) is the 0-based day-of-year, which we walk
  // through the month-length table for that year to get month and day.

  var BASE_YEAR = 1970;
  var LAST_YEAR = 2200;

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // Days in each month for a common year; February gets +1 in a leap year.
  var COMMON_MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // YEAR_START[i] = epoch-day of Jan 1 of (BASE_YEAR + i).
  // Index 0 corresponds to 1970 (epoch-day 0). We build through LAST_YEAR + 1
  // so the search always has a sentinel upper bound above any real day.
  var YEAR_START = (function () {
    var arr = [];
    var day = 0; // 1970-01-01 is epoch-day 0
    for (var y = BASE_YEAR; y <= LAST_YEAR + 1; y++) {
      arr.push(day);
      day += isLeap(y) ? 366 : 365;
    }
    return arr;
  })();

  // Greatest index i such that YEAR_START[i] <= target. Classic lower-bound /
  // upper-bound style binary search returning the predecessor index.
  function findYearIndex(target) {
    var lo = 0;
    var hi = YEAR_START.length - 1;
    // Invariant: YEAR_START[lo] <= target (we keep lo valid). Narrow until
    // lo and hi are adjacent, then lo is the answer.
    if (target < YEAR_START[0]) return 0; // clamp below 1970 (shouldn't happen)
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1; // bias up so lo can advance and we terminate
      if (YEAR_START[mid] <= target) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }

  function isChristmas(epochDay) {
    var idx = findYearIndex(epochDay);
    var year = BASE_YEAR + idx;
    var doy = epochDay - YEAR_START[idx]; // 0-based day of year

    // Resolve month/day by walking the month-length table.
    var feb = isLeap(year) ? 29 : 28;
    var remaining = doy;
    for (var m = 0; m < 12; m++) {
      var len = (m === 1) ? feb : COMMON_MONTH_DAYS[m];
      if (remaining < len) {
        // month m (0-based), day (remaining + 1) (1-based)
        return m === 11 && (remaining + 1) === 25;
      }
      remaining -= len;
    }
    return false; // doy out of range for a year; never Christmas
  }

  IIC.register({
    id: 21,
    name: "Year-Start Table Binary Search",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "At load time it builds a sorted table of the epoch-day on which January 1 falls for every year from 1970 to 2201, accumulated using the Gregorian leap rule. For each vote it floors localMs/86400000 to a day count, binary-searches the table for the latest year-start at or before that day to identify the civil year, then subtracts to get the 0-based day-of-year and walks the month-length table (with February adjusted for leap years) to recover month and day, returning true only for December 25.",
    flavor: "It would rather do log-n lookups in a table it built itself than trust a single modulo.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      return isChristmas(epochDay);
    }
  });
})();

/* #22 — Anchor-Walk From 1970 Thursday [Epoch Arithmetic] */
(function () {
  // Anchor-walk Gregorian date resolution.
  //
  // Known anchor: epoch-day 0 is 1970-01-01 (a Thursday). The Gregorian
  // calendar repeats exactly every 400 years (146097 days). We reduce the
  // target epoch-day into one 400-year cycle by whole-cycle arithmetic, then
  // literally walk that cycle: step forward year by year, subtracting each
  // year's length (365 or 366) until the remaining days fall inside the
  // current year, then step month by month the same way. No closed-form
  // peel, no date library: just an anchor and a walk.

  var DAYS_PER_400Y = 146097; // 400 Gregorian years, including 97 leap days

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  var COMMON_MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  IIC.register({
    id: 22,
    name: "Anchor-Walk From 1970 Thursday",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "Treats epoch-day = floor(localMs/86400000) as a count from the 1970-01-01 anchor, reduces it into a single 400-year Gregorian cycle by whole-cycle arithmetic, then walks that cycle one year at a time (subtracting 365 or 366 per the leap rule) to find the civil year, and one month at a time to find month and day. Reports true only on December 25.",
    flavor: "It refuses to trust any date library and instead re-derives the calendar by stepping forward from a single Thursday in 1970.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);

      // Number of whole 400-year cycles between 1970 and the cycle that
      // contains epochDay. Use Math.floor so negative (pre-1970) days work.
      var cycle = Math.floor(epochDay / DAYS_PER_400Y);
      // Remaining day offset inside this cycle, always 0 .. 146096.
      var rem = epochDay - cycle * DAYS_PER_400Y;

      // The cycle starts at year (1970 + 400*cycle). Walk years forward,
      // peeling off whole years until the remainder is within the current
      // year. At most 400 iterations, so bounded and fast.
      var year = 1970 + cycle * 400;
      while (true) {
        var yearLen = isLeap(year) ? 366 : 365;
        if (rem < yearLen) break;
        rem -= yearLen;
        year++;
      }
      // rem is now the 0-based day-of-year within `year`.

      // Walk months forward the same way.
      var leap = isLeap(year);
      var month = 1; // 1 = January
      while (true) {
        var dim = month === 2 && leap ? 29 : COMMON_MONTH_LEN[month - 1];
        if (rem < dim) break;
        rem -= dim;
        month++;
      }
      var day = rem + 1; // 1-based day-of-month

      return month === 12 && day === 25;
    }
  });
})();

/* #23 — Estimate-then-Correct Year Solver [Epoch Arithmetic] */
(function () {
  // ---- Estimate-then-correct year resolver (Newton-style) ------------------
  //
  // Given the integer local epoch-day (days since 1970-01-01), find the civil
  // year the way you would solve f(year) = epochDay numerically: start from a
  // cheap closed-form estimate, then nudge the estimate up or down until the
  // year-start bounds bracket the day. Once the year is pinned, the remaining
  // day-of-year is just epochDay minus that year's January-1 epoch-day, and a
  // small cumulative-month table turns it into a (month, day).
  //
  // The "Newton-style" part is the estimate plus bounded correction: the mean
  // Gregorian year is 365.2425 days, so floor(epochDay / 365.2425) + 1970 lands
  // within one year of the truth. We then step at most a couple of years in the
  // direction that fixes the residual, which is the discrete analogue of a
  // Newton step where the local slope is the length of one year.

  var MS_PER_DAY = 86400000;

  // Proleptic-Gregorian leap test.
  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // Number of leap years in the half-open interval [1, y-1] (i.e. strictly
  // before year y), counting from year 1. Pure integer arithmetic.
  function leapsBefore(y) {
    var n = y - 1;
    return Math.floor(n / 4) - Math.floor(n / 100) + Math.floor(n / 400);
  }

  // Epoch-day of January 1 of `year`, i.e. days from 1970-01-01 to year-01-01.
  // Built from the day count since year 1 minus the day count to 1970, so it
  // stays correct for years on either side of the epoch.
  var DAYS_YEAR1_TO_1970 = 365 * (1970 - 1) + leapsBefore(1970); // 719162
  function yearStartEpochDay(year) {
    var daysSinceYear1 = 365 * (year - 1) + leapsBefore(year);
    return daysSinceYear1 - DAYS_YEAR1_TO_1970;
  }

  // Cumulative days before the start of each month, for common and leap years.
  // Index 0 unused; index m holds days elapsed before month m begins.
  function buildCumulative(leap) {
    var lengths = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var cum = new Array(13);
    cum[1] = 0;
    for (var m = 2; m <= 12; m++) cum[m] = cum[m - 1] + lengths[m - 1];
    return cum;
  }
  var CUM_COMMON = buildCumulative(false);
  var CUM_LEAP = buildCumulative(true);

  IIC.register({
    id: 23,
    name: "Estimate-then-Correct Year Solver",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "Takes floor(localMs/86400000) as days since 1970-01-01, estimates the civil year as floor(epochDay/365.2425)+1970, then corrects the estimate by stepping it up or down until that year's January-1 epoch-day and the next year's bracket the day. It subtracts the resolved year-start to get the zero-based day-of-year, picks the leap or common cumulative-month table, and walks the table to a (month, day); it votes yes when that is December 25.",
    flavor: "Guesses the year, checks its own work, and adjusts, like a clerk who never quite trusts the first answer.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / MS_PER_DAY);

      // ---- Newton-style estimate of the year -------------------------------
      // Mean Gregorian year length is 365.2425 days. This estimate is within
      // one year of the truth across the whole supported range.
      var year = Math.floor(epochDay / 365.2425) + 1970;

      // ---- Bounded correction: bracket epochDay by year-start bounds --------
      // Walk the estimate toward the year whose [Jan1, nextJan1) interval
      // contains epochDay. The step count is tiny (at most a handful), but we
      // cap it defensively so a bad estimate can never loop unbounded.
      var start = yearStartEpochDay(year);
      var guard = 0;
      while (epochDay < start && guard < 8) {
        year -= 1;
        start = yearStartEpochDay(year);
        guard++;
      }
      while (guard < 8) {
        var nextStart = yearStartEpochDay(year + 1);
        if (epochDay < nextStart) break;
        year += 1;
        start = nextStart;
        guard++;
      }

      // ---- Resolve the day-of-year, then month/day -------------------------
      var doy = epochDay - start; // 0-based day index within the year
      var cum = isLeap(year) ? CUM_LEAP : CUM_COMMON;

      // Find the month whose cumulative range contains doy. December (12) is
      // all we ultimately care about, so a short forward scan is plenty.
      var month = 12;
      for (var m = 1; m <= 12; m++) {
        var next = m === 12 ? (isLeap(year) ? 366 : 365) : cum[m + 1];
        if (doy < next) { month = m; break; }
      }
      var day = doy - cum[month] + 1; // 1-based day of month

      return month === 12 && day === 25;
    }
  });
})();

/* #24 — Continued-Fraction Year Length [Epoch Arithmetic] */
(function () {
  // Continued-fraction year length.
  //
  // The mean Gregorian year is 365.2425 days = 365 + 97/400. Expanding the
  // fractional part 97/400 as a continued fraction gives the terms [0; 4, 8, 12],
  // whose convergents are 0, 1/4, 8/33, 97/400. We take the third convergent,
  // 8/33, as a rational approximation of the leftover quarter-ish day. That makes
  // the approximate year length 365 + 8/33 = 12053/33 days. The convergent 8/33
  // (0.242424...) is accurate to about three parts in ten thousand, close enough
  // that an integer-divided year estimate is never off by more than a single year.
  //
  // So: estimate the year by dividing the epoch-day count by 12053/33 (done with
  // integer arithmetic to stay exact), then CORRECT that estimate against the real
  // Gregorian year boundaries — which differ from the smooth rational year because
  // leap days arrive in lumps — and finally peel the day-of-year into a month/day.

  // Approximate year length 365 + 8/33 expressed as a single fraction NUM/DEN.
  var YEAR_NUM = 12053; // 365*33 + 8
  var YEAR_DEN = 33;

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // Exact epoch-day (days since 1970-01-01) of Jan 1 of year y, by direct
  // leap-day accounting. This is the "truth" the rational estimate is corrected
  // against; it counts the leap days that the smooth 12053/33 slope only averages.
  function jan1EpochDay(y) {
    var n = y - 1970;
    // Whole 365-day years, plus the surplus leap days accumulated since 1970.
    // Leap days are counted from year 1 so the century/400 rules apply cleanly,
    // then the count fixed at 1970 (478 leap years in years 1..1969) is removed.
    var prev = y - 1;
    var leapsBefore = Math.floor(prev / 4) - Math.floor(prev / 100) + Math.floor(prev / 400);
    var LEAPS_TO_1969 = 477; // floor(1969/4)-floor(1969/100)+floor(1969/400) = 492-19+4
    return n * 365 + (leapsBefore - LEAPS_TO_1969);
  }

  var COMMON_MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  IIC.register({
    id: 24,
    name: "Continued-Fraction Year Length",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "Approximates the mean Gregorian year (365.2425 days = 365 + 97/400) by the continued-fraction convergent 8/33, giving an approximate year length of 12053/33 days. It estimates the civil year by integer-dividing epoch-day = floor(localMs/86400000) by that fraction, corrects the estimate by stepping to the true Jan-1 boundary computed from exact leap-day counts, then subtracts month lengths to recover month and day. Reports true only on December 25.",
    flavor: "It trusts a fraction to get close and then makes the leap days answer for the gap.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);

      // Continued-fraction year estimate: years elapsed since 1970 is roughly
      // epochDay / (12053/33) = epochDay*33/12053. Floor it with integer ops.
      // For negative epoch-days, Math.floor keeps the estimate on the low side,
      // which the upward correction below then fixes.
      var year = 1970 + Math.floor((epochDay * YEAR_DEN) / YEAR_NUM);

      // Correct the rational estimate against real Gregorian boundaries. The 8/33
      // convergent is good enough that this loop runs at most once in practice;
      // the bounds are generous guards, never a real walk.
      var guard = 0;
      while (jan1EpochDay(year) > epochDay && guard++ < 8) year--;
      while (jan1EpochDay(year + 1) <= epochDay && guard++ < 16) year++;

      // Day-of-year, 0-based.
      var doy = epochDay - jan1EpochDay(year);

      // Peel month lengths to recover month and day.
      var leap = isLeap(year);
      var month = 1;
      while (true) {
        var dim = (month === 2 && leap) ? 29 : COMMON_MONTH_LEN[month - 1];
        if (doy < dim) break;
        doy -= dim;
        month++;
      }
      var day = doy + 1;

      return month === 12 && day === 25;
    }
  });
})();

/* #25 — Days-In-Prior-Years Summation [Epoch Arithmetic] */
(function () {
  // Days-in-prior-years summation.
  //
  // epoch-day = floor(localMs / 86400000) is the count of whole days since
  // 1970-01-01. To find the civil year we ask: how many days separate
  // 1970-01-01 from the start (Jan 1) of a candidate year Y? That gap is a
  // closed-form sum of 365-day common years plus one extra day for every
  // leap year strictly between 1970 and Y. Leap years are counted with the
  // standard /4, /100, /400 inclusion-exclusion. We pick the largest Y whose
  // gap is still <= epoch-day, which makes epoch-day fall inside year Y; the
  // leftover days are the zero-based day-of-year, which we resolve to a
  // month and day via the month-length table.

  // Number of leap years in the half-open interval [1970, y), i.e. strictly
  // before Jan 1 of year y. Uses the count of multiples of 4/100/400 below y.
  function leapsBefore(y) {
    // multiples of n in [1970, y) = countBelow(y) - countBelow(1970)
    function mult(n) {
      var a = Math.floor((y - 1) / n);   // multiples of n in [1, y-1]
      var b = Math.floor(1969 / n);      // multiples of n in [1, 1969]
      return a - b;
    }
    return mult(4) - mult(100) + mult(400);
  }

  // Days from 1970-01-01 to Jan 1 of year y. Positive for y > 1970, negative
  // for y < 1970, zero for y == 1970. Each year contributes 365 days, plus one
  // for each leap year in between. We express this relative to 1970 so the same
  // closed form works on both sides of the epoch.
  function daysToYearStart(y) {
    var dy = y - 1970;
    // leap days accumulated from 1970 up to (not including) year y.
    // For y >= 1970 this is leapsBefore(y); the leapsBefore helper already
    // handles y < 1970 correctly because mult() returns a negative span there.
    var leaps = leapsBefore(y);
    return dy * 365 + leaps;
  }

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // Cumulative day-of-year at the start of each month (0-based), common year.
  // Index m (0=Jan) -> number of days before month m begins.
  var MONTH_START_COMMON = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  var MONTH_LEN_COMMON = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  IIC.register({
    id: 25,
    name: "Days-In-Prior-Years Summation",
    cohort: "Epoch Arithmetic",
    derive: "scratch",
    methodology: "Takes epoch-day = floor(localMs/86400000) and finds the civil year by comparing it against a closed-form running total of days elapsed since 1970-01-01: each year before the candidate contributes 365 days plus one for every leap year, where leap years are counted by inclusion-exclusion over multiples of 4, 100, and 400. It locates the largest year whose day-total does not exceed epoch-day, takes the remainder as the zero-based day-of-year, then walks a month-length table (February adjusted for leap years) to recover month and day, voting true only for December 25.",
    flavor: "It would rather re-tabulate every leap year since the moon landing than ask a calendar what year it is.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);

      // First estimate the year, then correct by at most a couple of steps.
      // 365.2425 days per average Gregorian year is the long-run rate.
      var year = 1970 + Math.floor(epochDay / 365.2425);

      // Snap so that daysToYearStart(year) <= epochDay < daysToYearStart(year+1).
      // The estimate is off by at most one in practice; loop is bounded anyway.
      var guard = 0;
      while (daysToYearStart(year) > epochDay && guard < 8) { year -= 1; guard += 1; }
      while (daysToYearStart(year + 1) <= epochDay && guard < 16) { year += 1; guard += 1; }

      // Zero-based day within the resolved year.
      var dayOfYear = epochDay - daysToYearStart(year); // 0 .. 365

      var leap = isLeap(year);

      // Christmas-specific shortcut without losing the honest derivation:
      // resolve the actual month and day from the day-of-year, then test.
      // December 1 (0-based) starts at index 334 in a common year, 335 in a leap.
      var decStart = MONTH_START_COMMON[11] + (leap ? 1 : 0);

      // Recover month/day by scanning the month table. Bounded to 12 steps.
      var month = 0; // 0-based
      var remaining = dayOfYear;
      for (var m = 0; m < 12; m++) {
        var len = MONTH_LEN_COMMON[m];
        if (m === 1 && leap) len = 29;
        if (remaining < len) { month = m; break; }
        remaining -= len;
      }
      var day = remaining + 1; // 1-based

      // month 11 == December (0-based). decStart kept for an auditable trail.
      return month === 11 && day === 25 && (dayOfYear === decStart + 24);
    }
  });
})();

/* #26 — Brainfuck Comparison VM [Esolang & Exotic Interpreters] */
(function () {
  // A small, real Brainfuck virtual machine.
  //
  // The date question (is the local civil date December 25?) is reduced to a
  // pair of small integers, month and day, which are fed to the VM through its
  // input stream via the `,` instruction. A fixed Brainfuck program then does
  // the actual comparison entirely in BF: it decrements month down to zero to
  // test month == 12, decrements day down to zero to test day == 25, ANDs the
  // two results, and emits a single output byte (1 for yes, 0 for no) with `.`.
  // The host reads that one output byte back and turns it into the boolean.
  //
  // The interpreter is a genuine BF VM: 8 instructions (> < + - . , [ ]),
  // a wrapping byte tape, a bracket-matching jump table built once, and a
  // bounded step budget so a malformed program can never loop forever.

  // ---- the Brainfuck program ------------------------------------------------
  //
  // Tape layout we rely on:
  //   cell0 = month (read with ,)
  //   cell1 = day   (read with ,)
  //   cell2 = scratch / month-matches flag
  //   cell3 = scratch / day-matches flag
  //   cell4 = result
  //
  // Strategy without relying on 256-wraparound subtleties: subtract 12 from
  // month by hand and check the remainder is zero; subtract 25 from day and
  // check the remainder is zero. "Is this cell zero" is done by copying it and
  // using the standard [-] drain with a flag.
  //
  // We build the program with readable helpers so the constant is auditable.

  // Subtract/add N from the current cell: N copies of '-' or '+'.
  function minus(n) { return new Array(n + 1).join('-'); }
  function plus(n) { return new Array(n + 1).join('+'); }

  // We assemble the program from explicit absolute moves while tracking the
  // pointer position, so the generated BF is correct by construction rather
  // than by hand-counting > and < in a string literal.
  //
  // Tape layout: 0=month, 1=day, 2=monthFlag, 3=dayFlag, 4=result.
  function buildProgram() {
    // We will track an absolute pointer position and emit moves to reach a
    // target cell, so the generated BF is correct by construction.
    var src = "";
    var pos = 0;
    function go(target) {
      while (pos < target) { src += ">"; pos++; }
      while (pos > target) { src += "<"; pos--; }
    }
    function emit(s) { src += s; }

    // Cells: 0=month, 1=day, 2=monthFlag, 3=dayFlag, 4=result, 5=scratch
    go(0); emit(",");          // read month
    go(1); emit(",");          // read day

    // month flag: optimistic 1, cleared if (month-12) != 0
    go(0); emit(minus(12));    // cell0 -= 12
    go(2); emit(plus(1));      // cell2 = 1
    go(0); emit("[");          // while cell0:
      emit("[-]");             //   zero cell0 (loop runs once)
      go(2); emit("[-]");      //   zero cell2
      go(0);                   //   back to loop cell
    emit("]");

    // day flag: optimistic 1, cleared if (day-25) != 0
    go(1); emit(minus(25));    // cell1 -= 25
    go(3); emit(plus(1));      // cell3 = 1
    go(1); emit("[");          // while cell1:
      emit("[-]");             //   zero cell1
      go(3); emit("[-]");      //   zero cell3
      go(1);
    emit("]");

    // result = monthFlag AND dayFlag
    // result(cell4)=0; if cell2 { copy cell3 -> cell4 (consuming cell3 via scratch) }
    go(4); emit("[-]");        // cell4 = 0
    // If cell2 != 0, move cell3's value into cell4. We don't need to preserve
    // cell3 afterward. Standard "if": while cell2 { cell4 += cell3; zero cell3; zero cell2 }
    go(2); emit("[");          // while cell2:
      // move cell3 into cell4 (destructive on cell3)
      go(3); emit("[");        //   while cell3:
        emit("-");             //     cell3--
        go(4); emit("+");      //     cell4++
        go(3);                 //     back to cell3
      emit("]");
      go(2); emit("[-]");      //   zero cell2 -> loop ends
    emit("]");

    // output the result byte
    go(4); emit(".");
    return src;
  }

  var BF = buildProgram();

  // ---- bracket matching jump table (built once) -----------------------------
  function buildJumps(prog) {
    var jumps = new Int32Array(prog.length);
    var stack = [];
    for (var i = 0; i < prog.length; i++) {
      var c = prog.charCodeAt(i);
      if (c === 91) {            // '['
        stack.push(i);
      } else if (c === 93) {     // ']'
        var open = stack.pop();
        jumps[open] = i;
        jumps[i] = open;
      }
    }
    return jumps;
  }

  var JUMPS = buildJumps(BF);
  var PROG_LEN = BF.length;

  // ---- the VM ---------------------------------------------------------------
  // Runs BF with the given input bytes, returns the array of output bytes.
  function runBF(inputBytes) {
    var tape = new Uint8Array(64);
    var ptr = 0;
    var ip = 0;
    var inPos = 0;
    var out = [];
    var steps = 0;
    var STEP_LIMIT = 100000; // generous; this program needs well under this

    while (ip < PROG_LEN) {
      if (++steps > STEP_LIMIT) break; // safety valve; never trips in practice
      var op = BF.charCodeAt(ip);
      switch (op) {
        case 62: // '>'
          ptr = (ptr + 1) & 63;
          break;
        case 60: // '<'
          ptr = (ptr - 1) & 63;
          break;
        case 43: // '+'
          tape[ptr] = (tape[ptr] + 1) & 255;
          break;
        case 45: // '-'
          tape[ptr] = (tape[ptr] - 1) & 255;
          break;
        case 46: // '.'
          out.push(tape[ptr]);
          break;
        case 44: // ','
          tape[ptr] = inPos < inputBytes.length ? (inputBytes[inPos++] & 255) : 0;
          break;
        case 91: // '['
          if (tape[ptr] === 0) ip = JUMPS[ip];
          break;
        case 93: // ']'
          if (tape[ptr] !== 0) ip = JUMPS[ip];
          break;
        default:
          break; // ignore any non-instruction char
      }
      ip++;
    }
    return out;
  }

  IIC.register({
    id: 26,
    name: "Brainfuck Comparison VM",
    cohort: "Esolang & Exotic Interpreters",
    derive: "extract",
    methodology: "Extracts the local month and day from new Date(ctx.localMs) via getUTCMonth()+1 and getUTCDate(), feeds those two integers into a real Brainfuck virtual machine through its input (,) stream, and runs a fixed BF program that subtracts 12 from month and 25 from day, tests each remainder for zero with flag-clearing loops, ANDs the two flags, and emits one output byte. The host reads that byte: a 1 means it is December 25.",
    flavor: "Outsources a two-field date comparison to an eight-instruction esolang, because the obvious if-statement felt insufficiently load-bearing.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 1..12
      var day = d.getUTCDate();        // 1..31
      var output = runBF([month, day]);
      return output.length > 0 && output[output.length - 1] === 1;
    }
  });
})();

/* #27 — Forth RPN Stack Machine [Esolang & Exotic Interpreters] */
(function () {
  // A tiny Forth-style RPN stack machine.
  //
  // We extract the local civil month/day with the timezone trick
  // (getUTC* on localMs), push them onto a stack, then run a fixed
  // Forth program that asks "is the month 12 AND the day 25?" and
  // leaves a single boolean flag on top of the stack.
  //
  // The interpreter is deliberately a real stack machine, not a
  // shortcut: each token either pushes a literal or pops/pushes
  // operands exactly as the corresponding Forth word would. Forth
  // uses 0 for false and -1 (all bits set) for true; we honour that
  // convention internally and only coerce to a JS boolean at the end.

  var TRUE = -1;
  var FALSE = 0;

  // The program. Stack effect, reading left to right:
  //   dup            ( m d -- m d d )            duplicate the day
  //   25 =           ( m d d -- m d f )          f = (d == 25)
  //   swap           ( m d f -- m f d )
  //   drop           ( m f d -- m f )            discard the spare day copy
  //   swap           ( m f -- f m )
  //   12 =           ( f m -- f g )              g = (m == 12)
  //   and            ( f g -- h )                h = f AND g
  //
  // Initial stack (bottom -> top) is [ month, day ].
  var PROGRAM = ['dup', '25', '=', 'swap', 'drop', 'swap', '12', '=', 'and'];

  // Word definitions. Each operates on the stack array in place.
  // Comparisons and logic return Forth-style flags (0 / -1).
  var WORDS = {
    dup: function (s) { var a = s[s.length - 1]; s.push(a); },
    drop: function (s) { s.pop(); },
    swap: function (s) {
      var n = s.length, a = s[n - 1], b = s[n - 2];
      s[n - 1] = b; s[n - 2] = a;
    },
    '=': function (s) {
      var b = s.pop(), a = s.pop();
      s.push(a === b ? TRUE : FALSE);
    },
    and: function (s) {
      var b = s.pop(), a = s.pop();
      s.push(a & b); // bitwise AND; -1 & -1 === -1, anything & 0 === 0
    }
  };

  function isInteger(tok) {
    // Accept optional leading minus, then digits only.
    for (var i = 0; i < tok.length; i++) {
      var c = tok.charCodeAt(i);
      if (i === 0 && c === 45 && tok.length > 1) continue; // '-'
      if (c < 48 || c > 57) return false;
    }
    return tok.length > 0;
  }

  // Run an RPN token program over an initial stack, return the final top.
  function evalRPN(tokens, initialStack) {
    var stack = initialStack.slice();
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      if (isInteger(tok)) {
        stack.push(parseInt(tok, 10));
      } else {
        var word = WORDS[tok];
        if (!word) throw new Error('unknown word: ' + tok);
        word(stack);
      }
    }
    return stack[stack.length - 1];
  }

  IIC.register({
    id: 27,
    name: "Forth RPN Stack Machine",
    cohort: "Esolang & Exotic Interpreters",
    derive: "extract",
    methodology: "Reads the visitor's local month and day via getUTC* on ctx.localMs, pushes them onto a stack, and runs a fixed Forth-style RPN program ('dup 25 = swap drop swap 12 = and') on a from-scratch interpreter that implements dup, drop, swap, =, and as real stack words using Forth's 0/-1 flag convention. Votes yes when the program leaves a true flag on top.",
    flavor: "It answers the question in postfix, because asking a stack machine for an opinion in any other order would be rude.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // getUTCMonth is 0-based; December === 11
      var day = d.getUTCDate();
      var result = evalRPN(PROGRAM, [month, day]);
      return result === TRUE;
    }
  });
})();

/* #28 — Befunge Grid Walker [Esolang & Exotic Interpreters] */
(function () {
  // A small Befunge-93-style 2D interpreter. The civil month and day are
  // extracted from ctx.localMs, then fed as inputs to a hand-written grid
  // program. An instruction pointer walks the grid with a direction vector,
  // manipulating a stack, until it hits @ (halt). The single value printed
  // by the program (1 or 0) is the vote: 1 iff month==12 and day==25.
  //
  // Supported instructions (a practical Befunge-93 subset):
  //   0-9  push that digit
  //   + - *  pop a, pop b, push (b OP a)
  //   !    logical not: pop a, push (a==0)?1:0
  //   `    greater: pop a, pop b, push (b>a)?1:0
  //   :    duplicate top
  //   \    swap top two
  //   $    pop and discard
  //   >    set direction east        <  west       ^ north       v south
  //   _    pop a; go east if a==0 else west   (horizontal if)
  //   |    pop a; go south if a==0 else north (vertical if)
  //   g    pop y, pop x; push grid cell value at (x,y)   (used to read inputs)
  //   .    pop a; emit a (becomes program output)
  //   @    halt
  //   (space) no-op
  // The pointer wraps toroidally at the grid edges, like real Befunge.
  //
  // Inputs are injected as the integer cell values of two reserved cells the
  // program reads with `g`: month at (0,0) of an input plane and day at (1,0).
  // To keep cells single-purpose we hold inputs in a separate input array and
  // expose them through a tiny 'g'-from-inputs convention (x<0 reads inputs).

  // The grid. Each row is an array of single-char cells. The program:
  //   - reads MONTH and DAY from the input plane,
  //   - computes (month == 12) and (day == 25) and ANDs them,
  //   - prints the 1/0 result, then halts.
  //
  // Equality a==b is built from Befunge primitives as: (a-b == 0), i.e.
  // subtract then logical-not. AND of two booleans p,q (each 0/1) is p*q.
  //
  // Real Befunge control flow: the pointer travels along one row and wraps
  // back to column 0 of the SAME row at the right edge; it only changes rows
  // when a direction opcode (v ^ < >) tells it to. So the program snakes:
  //
  //   Row 0, heading EAST:  m 6 2 * - !   d 5 5 * - !   *   v
  //     m            push month
  //     6 2 *        push 12
  //     -            month - 12
  //     !            (month==12) ? 1 : 0          => p on stack
  //     d            push day
  //     5 5 *        push 25
  //     -            day - 25
  //     !            (day==25) ? 1 : 0            => q on stack
  //     *            p * q  (logical AND)         => result on stack
  //     v            turn south, drop to row 1
  //
  //   Row 1: the 'v' lands the pointer on a cell that routes it WEST into the
  //   output sequence ". @" laid out so the pointer reads '.' (emit) then '@'
  //   (halt). We place '<' under the 'v', then '@' and '.' to its left so a
  //   westbound pointer encounters '.' before '@'.
  //
  // 12 is built as 6*2 and 25 as 5*5 because Befunge digit literals push a
  // single digit at a time; there is no two-digit literal token.

  // Column index of the 'v' in row 0 (also where '<' sits in row 1):
  //   m 6 2 * - ! d 5 5 * - ! *  v
  //   0 1 2 3 4 5 6 7 8 9 ...   -> 'v' is at x = 13.
  var SRC = [
    "m62*-!d55*-!*v",  // row 0: compute p, compute q, AND, then go south
    "           @.<"   // row 1: '<' at x=13, then westbound hits '.' (x=12), '@' (x=11)
  ];

  // Characters 'm' and 'd' are custom "read input" opcodes: m pushes the
  // month, d pushes the day. Everything else is stock Befunge-93. Any
  // unrecognized character (including spaces) is a no-op.

  function buildGrid(src) {
    var rows = src.length;
    var cols = 0;
    var i, j;
    for (i = 0; i < rows; i++) if (src[i].length > cols) cols = src[i].length;
    var g = new Array(rows);
    for (i = 0; i < rows; i++) {
      var row = new Array(cols);
      var s = src[i];
      for (j = 0; j < cols; j++) {
        var ch = j < s.length ? s.charAt(j) : ' ';
        if (ch === ';') ch = ' ';
        row[j] = ch;
      }
      g[i] = row;
    }
    return { cells: g, rows: rows, cols: cols };
  }

  var GRID = buildGrid(SRC);

  // Set of recognized opcodes; any other character is a no-op (so labels are fine).
  function isOp(ch) {
    return "0123456789+-*!`:\\$><^v_|g.@md".indexOf(ch) !== -1;
  }

  function run(grid, month, day) {
    var cells = grid.cells, rows = grid.rows, cols = grid.cols;
    var x = 0, y = 0;     // instruction pointer position
    var dx = 1, dy = 0;   // direction: start moving east
    var stack = [];
    var output = null;
    var steps = 0;
    var MAX_STEPS = 4096; // bounded; this program halts in well under this

    function pop() { return stack.length ? stack.pop() : 0; }

    while (steps++ < MAX_STEPS) {
      var ch = cells[y][x];
      var a, b;
      if (ch >= '0' && ch <= '9') {
        stack.push(ch.charCodeAt(0) - 48);
      } else {
        switch (ch) {
          case '+': a = pop(); b = pop(); stack.push(b + a); break;
          case '-': a = pop(); b = pop(); stack.push(b - a); break;
          case '*': a = pop(); b = pop(); stack.push(b * a); break;
          case '!': a = pop(); stack.push(a === 0 ? 1 : 0); break;
          case '`': a = pop(); b = pop(); stack.push(b > a ? 1 : 0); break;
          case ':': a = pop(); stack.push(a); stack.push(a); break;
          case '\\': a = pop(); b = pop(); stack.push(a); stack.push(b); break;
          case '$': pop(); break;
          case '>': dx = 1; dy = 0; break;
          case '<': dx = -1; dy = 0; break;
          case '^': dx = 0; dy = -1; break;
          case 'v': dx = 0; dy = 1; break;
          case '_': a = pop(); dy = 0; dx = (a === 0) ? 1 : -1; break;
          case '|': a = pop(); dx = 0; dy = (a === 0) ? 1 : -1; break;
          case 'g':
            a = pop(); b = pop(); // y, x
            if (b >= 0 && b < cols && a >= 0 && a < rows) {
              stack.push(cells[a][b].charCodeAt(0));
            } else {
              stack.push(0);
            }
            break;
          case '.': output = pop(); break;
          case '@':
            return output;
          case 'm': stack.push(month); break;
          case 'd': stack.push(day); break;
          default: /* no-op (space, labels, unknown) */ break;
        }
      }
      // Advance pointer with toroidal wrap.
      x += dx; y += dy;
      if (x < 0) x = cols - 1; else if (x >= cols) x = 0;
      if (y < 0) y = rows - 1; else if (y >= rows) y = 0;
    }
    return output; // step cap reached (shouldn't happen for this program)
  }

  IIC.register({
    id: 28,
    name: "Befunge Grid Walker",
    cohort: "Esolang & Exotic Interpreters",
    derive: "extract",
    methodology: "Extracts the local civil month and day via new Date(ctx.localMs).getUTCMonth()/getUTCDate(), then runs a hand-written Befunge-93-style program on a 2D character grid. An instruction pointer with a direction vector walks the grid manipulating a stack: it pushes month and day, builds the literals 12 and 25 by multiplication, subtracts and logical-NOTs to test each for equality, multiplies the two booleans for a logical AND, prints the result, and halts at @. The single printed value is the vote.",
    flavor: "A two-dimensional program counter wanders a grid of glyphs and somehow comes back with the right answer; this is what computing looked like in the timeline where we never standardized on rows.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 1-based for the grid program
      var day = d.getUTCDate();
      var out = run(GRID, month, day);
      return out === 1;
    }
  });
})();

/* #29 — Church Numeral Equality [Esolang & Exotic Interpreters] */
(function () {
  // Lambda calculus with Church numerals. A Church numeral n is the function
  // that takes f and x and applies f to x exactly n times: ZERO = f=>x=>x,
  // SUCC adds one application. We encode 12, 25 and the visitor's local month
  // and day this way, then decide Dec 25 purely by Church-numeral equality,
  // which is built from the Church predecessor, isZero, and a Church AND.

  // --- the calculus ---------------------------------------------------------
  // Booleans: TRUE picks the first argument, FALSE the second.
  var TRUE = function (a) { return function (b) { return a; }; };
  var FALSE = function (a) { return function (b) { return b; }; };
  var AND = function (p) { return function (q) { return p(q)(p); }; };

  // ZERO and SUCC.
  var ZERO = function (f) { return function (x) { return x; }; };
  var SUCC = function (n) {
    return function (f) {
      return function (x) {
        return f(n(f)(x));
      };
    };
  };

  // ISZERO n = n (_ => FALSE) TRUE: a numeral applied to "always FALSE" over
  // the seed TRUE yields TRUE only when it never applies, i.e. when n is zero.
  var ISZERO = function (n) {
    return n(function (_) { return FALSE; })(TRUE);
  };

  // Kleene's predecessor via pairs. A pair is k => k(a)(b); SHIFT advances
  // (a, b) -> (b, b+1) so iterating it n times from (0, 0) lands first on n-1.
  var PAIR = function (a) { return function (b) { return function (k) { return k(a)(b); }; }; };
  var FST = function (p) { return p(function (a) { return function (b) { return a; }; }); };
  var SND = function (p) { return p(function (a) { return function (b) { return b; }; }); };
  var SHIFT = function (p) { return PAIR(SND(p))(SUCC(SND(p))); };
  var PRED = function (n) {
    return FST(n(SHIFT)(PAIR(ZERO)(ZERO)));
  };

  // Monus (truncated subtraction): apply PRED to a, b times. a - b clamps at 0.
  var SUB = function (a) { return function (b) { return b(PRED)(a); }; };

  // Church equality: a == b iff (a - b) is zero AND (b - a) is zero.
  var EQ = function (a) { return function (b) {
    return AND(ISZERO(SUB(a)(b)))(ISZERO(SUB(b)(a)));
  }; };

  // Build the small Church numerals we need once, at load time. Months are
  // 1..12 and days 1..31, so we never construct a numeral above 31.
  var NUM = [ZERO];
  for (var i = 1; i <= 31; i++) NUM[i] = SUCC(NUM[i - 1]);

  var CHURCH_12 = NUM[12];
  var CHURCH_25 = NUM[25];

  // Force a Church boolean down to a real JS boolean by feeding it true/false.
  function toBool(churchBool) {
    return churchBool(true)(false);
  }

  IIC.register({
    id: 29,
    name: "Church Numeral Equality",
    cohort: "Esolang & Exotic Interpreters",
    derive: "extract",
    methodology: "Extracts the local month and day from new Date(ctx.localMs) via getUTCMonth()+1 and getUTCDate(), encodes them and the constants 12 and 25 as Church numerals (zero plus repeated successor), and tests month==12 and day==25 using a lambda-calculus equality built from Kleene's pair-based predecessor, truncated subtraction, ISZERO, and a Church AND, then collapses the resulting Church boolean to a JavaScript boolean.",
    flavor: "It proves it's Christmas without ever using a number, only functions that have strong opinions about how many times to call other functions.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 1..12, December == 12
      var day = d.getUTCDate();        // 1..31
      var monthEq = EQ(NUM[month])(CHURCH_12);
      var dayEq = EQ(NUM[day])(CHURCH_25);
      return toBool(AND(monthEq)(dayEq));
    }
  });
})();

/* #30 — S/K Combinator Christmas Predicate [Esolang & Exotic Interpreters] */
(function () {
  // ---------------------------------------------------------------------------
  // SK (with I) combinator calculus engine.
  //
  // A reducer that knows exactly three rewrite rules and nothing else:
  //     I x       -> x
  //     K x y     -> x
  //     S x y z   -> x z (y z)
  // Everything above that (booleans, Church numerals, predecessor, equality)
  // is expressed as combinator TERMS and evaluated by this reducer. The only
  // job JavaScript does is read the civil month/day off ctx.localMs and hand
  // the engine two Church numerals to compare.
  // ---------------------------------------------------------------------------

  // A term is a primitive combinator string ("S"/"K"/"I") or an application
  // node [fn, arg]. Applications are left-associative (currying convention):
  // App(App(a,b),c) reads as "a b c".
  function App(a, b) { return [a, b]; }
  function isApp(t) { return Array.isArray(t); }

  // ap(a,b,c,...) builds the left-nested application ((a b) c) ...
  function ap() {
    var t = arguments[0];
    for (var i = 1; i < arguments.length; i++) t = App(t, arguments[i]);
    return t;
  }

  var STEP_BUDGET = 500000;
  var steps;

  // One normal-order (leftmost-outermost) step at the head of `t`.
  // Returns the reduced term, or null if the head is already in weak head
  // normal form (no redex at the spine head).
  function headStep(t) {
    // Flatten spine: head + argument stack (args[0] = first applied arg).
    var stack = [];
    var head = t;
    while (isApp(head)) { stack.push(head[1]); head = head[0]; }
    stack.reverse();

    var consumed, redex;
    if (head === "I" && stack.length >= 1) {
      redex = stack[0]; consumed = 1;
    } else if (head === "K" && stack.length >= 2) {
      redex = stack[0]; consumed = 2;
    } else if (head === "S" && stack.length >= 3) {
      var x = stack[0], y = stack[1], z = stack[2];
      redex = App(App(x, z), App(y, z)); consumed = 3;
    } else {
      return null; // head normal at the spine
    }
    // Re-apply the leftover arguments.
    var out = redex;
    for (var i = consumed; i < stack.length; i++) out = App(out, stack[i]);
    return out;
  }

  // Reduce to weak head normal form: fire head redexes until none remain.
  function whnf(t) {
    while (true) {
      var n = headStep(t);
      if (n === null) return t;
      t = n;
      if (++steps > STEP_BUDGET) throw new Error("step budget exceeded");
    }
  }

  // Reduce to full normal form: WHNF the spine head, then normalize each
  // argument left to right. Normal order means K can discard a divergent
  // argument before we ever try to normalize it.
  function normalize(t) {
    t = whnf(t);
    if (!isApp(t)) return t; // bare combinator
    // Rebuild the spine with each argument normalized.
    var stack = [];
    var head = t;
    while (isApp(head)) { stack.push(head[1]); head = head[0]; }
    stack.reverse();
    var out = head;
    for (var i = 0; i < stack.length; i++) {
      out = App(out, normalize(stack[i]));
      if (++steps > STEP_BUDGET) throw new Error("step budget exceeded");
    }
    return out;
  }

  function reduce(t) {
    steps = 0;
    return normalize(t);
  }

  // ---------------------------------------------------------------------------
  // Bracket abstraction: turn a body containing a sentinel variable into an
  // S/K/I term implementing \var. body. Standard (S,K,I) algorithm.
  // ---------------------------------------------------------------------------
  function freeIn(t, V) {
    if (t === V) return true;
    if (isApp(t)) return freeIn(t[0], V) || freeIn(t[1], V);
    return false;
  }
  function abstr(t, V) {
    if (t === V) return "I";                 // \x.x = I
    if (!freeIn(t, V)) return App("K", t);   // \x.E = K E  (x not free)
    // \x.(a b) = S (\x.a) (\x.b)
    return ap("S", abstr(t[0], V), abstr(t[1], V));
  }

  // ---------------------------------------------------------------------------
  // Church encodings as S/K/I terms.
  // ---------------------------------------------------------------------------
  var TRUE = "K";              // TRUE  a b -> a
  var FALSE = App("K", "I");   // FALSE a b -> b

  var ZERO = App("K", "I");                         // \f x. x
  var SUCC = ap("S", ap("S", App("K", "S"), "K"));  // \n f x. f (n f x)

  function churchOf(n) {
    var t = ZERO;
    for (var i = 0; i < n; i++) t = App(SUCC, t);
    return reduce(t);
  }

  // ISZERO = \n. n (K FALSE) TRUE
  var ISZERO = (function () {
    var N = {};
    var body = ap(N, App("K", FALSE), TRUE);
    return reduce(abstr(body, N));
  })();

  // Pair / predecessor (Kleene, pair-based).
  // PAIR = \a b f. f a b ; FST = \p. p TRUE ; SND = \p. p FALSE
  var PAIR = (function () {
    var A = {}, B = {}, F = {};
    var body = ap(F, A, B);
    return reduce(abstr(abstr(abstr(body, F), B), A));
  })();
  var FST = (function () { var P = {}; return reduce(abstr(ap(P, TRUE), P)); })();
  var SND = (function () { var P = {}; return reduce(abstr(ap(P, FALSE), P)); })();

  // SHIFT = \p. PAIR (SND p) (SUCC (SND p))
  var SHIFT = (function () {
    var P = {};
    var sndp = ap(SND, P);
    var body = ap(PAIR, sndp, App(SUCC, sndp));
    return reduce(abstr(body, P));
  })();

  // PRED = \n. FST (n SHIFT (PAIR ZERO ZERO))
  var PRED = (function () {
    var N = {};
    var init = ap(PAIR, ZERO, ZERO);
    var body = ap(FST, ap(N, SHIFT, init));
    return reduce(abstr(body, N));
  })();

  // SUB = \m n. n PRED m  (apply PRED to m, n times)
  var SUB = (function () {
    var M = {}, N = {};
    var body = ap(N, PRED, M);
    return reduce(abstr(abstr(body, N), M));
  })();

  // LEQ = \m n. ISZERO (SUB m n)
  var LEQ = (function () {
    var M = {}, N = {};
    var body = ap(ISZERO, ap(SUB, M, N));
    return reduce(abstr(abstr(body, N), M));
  })();

  // AND = \p q. p q FALSE
  var AND = (function () {
    var P = {}, Q = {};
    var body = ap(P, Q, FALSE);
    return reduce(abstr(abstr(body, Q), P));
  })();

  // EQ = \m n. AND (LEQ m n) (LEQ n m)
  var EQ = (function () {
    var M = {}, N = {};
    var body = ap(AND, ap(LEQ, M, N), ap(LEQ, N, M));
    return reduce(abstr(abstr(body, N), M));
  })();

  // ---------------------------------------------------------------------------
  // Decode a normal-form Church boolean by reducing it applied to two distinct
  // primitives: TRUE picks the first, FALSE picks the second. JS never reads
  // the term's structure to decide truth.
  // ---------------------------------------------------------------------------
  function decodeBool(boolTerm) {
    var nf = reduce(ap(boolTerm, "S", "K")); // TRUE -> S, FALSE -> K
    return nf === "S";
  }

  // Precompute the small Church numerals we compare (months 1..12, days 1..31).
  var SMALL = [];
  for (var k = 0; k <= 31; k++) SMALL.push(churchOf(k));
  var N12 = SMALL[12];
  var N25 = SMALL[25];

  // The combinator reducer is correct but expensive: EQ folds a pair-based
  // predecessor, and the gate calls vote ~148k times. There are only a handful
  // of distinct comparisons possible (month against 12, day against 25), so we
  // run the engine ONCE per possible operand at load time and cache the decoded
  // Church booleans. Every truth value below is produced by the reducer; vote
  // itself is then a table lookup. This is "build the table once", not a
  // shortcut around the calculus.
  var MONTH_IS_12 = [];
  for (var m = 0; m <= 12; m++) {
    MONTH_IS_12[m] = decodeBool(reduce(ap(EQ, SMALL[m], N12)));
  }
  var DAY_IS_25 = [];
  for (var dd = 0; dd <= 31; dd++) {
    DAY_IS_25[dd] = decodeBool(reduce(ap(EQ, SMALL[dd], N25)));
  }

  IIC.register({
    id: 30,
    cohort: "Esolang & Exotic Interpreters",
    derive: "extract",
    name: "S/K Combinator Christmas Predicate",
    methodology: "Extracts the local civil month and day via getUTC* on ctx.localMs, encodes the candidate operands as Church numerals, and evaluates AND(EQ(month,12), EQ(day,25)) inside a hand-written S/K/I combinator reducer. EQ is assembled from LEQ, which is built from a pair-based Church predecessor and ISZERO, all expressed as combinator terms via bracket abstraction; each resulting Church boolean is decoded by reducing it applied to two distinct primitives. Since only months 1..12 and days 1..31 can occur, the reducer is run once per operand at load time to fill two truth tables, after which a vote is a lookup.",
    flavor: "It owns no concept of the number 25; it only knows that I, K, and S rewrite, and lets December fall out of the reductions.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 1..12 (UTC getter on localMs = local civil date)
      var day = d.getUTCDate();        // 1..31

      if (month < 1 || month > 12 || day < 1 || day > 31) return false;

      // Both halves were decided by the SK reducer at load time.
      return MONTH_IS_12[month] === true && DAY_IS_25[day] === true;
    }
  });
})();

/* #31 — Turing Machine Date Tape [Esolang & Exotic Interpreters] */
(function () {
  // A genuine single-tape deterministic Turing machine.
  //
  // We extract the LOCAL month (1..12) and day (1..31) via getUTC* on
  // ctx.localMs (the timezone trick), lay their decimal digits onto a tape
  // with a separator, and run a TM whose transition table walks the tape
  // left to right matching the digits of "12/25". The machine halts in
  // ACCEPT iff the tape reads exactly month 12 and day 25; any deviation
  // drives it into a REJECT sink state. No shortcuts: the verdict comes
  // out of the head position and state at halt, not from a JS comparison.

  // Tape alphabet: the decimal digits '0'..'9', the field separator '/',
  // and the blank symbol '_' that fills the infinite tape on both sides.
  var BLANK = "_";

  // Transition table. Keyed by state, then by the symbol under the head.
  // Each transition is [writeSymbol, move (+1 right / -1 left), nextState].
  // The machine starts at s_m_tens with the head on the first tape cell.
  //
  // States, in plain English:
  //   s_m_tens  expect the tens digit of the month  -> must be '1'
  //   s_m_ones  expect the ones digit of the month  -> must be '2'
  //   s_sep     expect the '/' separator
  //   s_d_tens  expect the tens digit of the day    -> must be '2'
  //   s_d_ones  expect the ones digit of the day    -> must be '5'
  //   s_end     expect the trailing blank (clean end of input)
  //   ACCEPT    halting accept state
  //   REJECT    halting reject sink (every unspecified read lands here)
  var TABLE = {
    s_m_tens: { "1": [/*write*/ "1", /*move*/ +1, "s_m_ones"] },
    s_m_ones: { "2": ["2", +1, "s_sep"] },
    s_sep:    { "/": ["/", +1, "s_d_tens"] },
    s_d_tens: { "2": ["2", +1, "s_d_ones"] },
    s_d_ones: { "5": ["5", +1, "s_end"] },
    s_end:    { _: [BLANK, 0, "ACCEPT"] }
  };

  // Run the machine over a tape (array of single-char symbols). Cells beyond
  // the written tape read as BLANK. Bounded step budget so a malformed table
  // can never spin forever.
  function run(tape) {
    var state = "s_m_tens";
    var head = 0;
    var MAX_STEPS = 64;
    for (var step = 0; step < MAX_STEPS; step++) {
      if (state === "ACCEPT") return true;
      if (state === "REJECT") return false;
      var sym = head >= 0 && head < tape.length ? tape[head] : BLANK;
      var row = TABLE[state];
      var t = row && row[sym];
      if (!t) { state = "REJECT"; continue; } // no rule for this read -> reject
      tape[head] = t[0];
      head += t[1];
      if (head < 0) head = 0; // left end stop; the right end is unbounded
      state = t[2];
    }
    return false; // step budget exhausted == did not reach ACCEPT
  }

  // Always emit a two-digit field so the tape layout is fixed and the table
  // can be a flat positional walk rather than a counting machine.
  function twoDigits(n) {
    return (n < 10 ? "0" : "") + n;
  }

  IIC.register({
    id: 31,
    name: "Turing Machine Date Tape",
    cohort: "Esolang & Exotic Interpreters",
    derive: "extract",
    methodology: "Reads the local month and day via getUTC* on ctx.localMs, writes them as the zero-padded decimal tape 'MM/DD', and runs a deterministic single-tape Turing machine whose transition table walks the cells matching '12/25'. The machine halts in an accept state only when every cell matches and the input ends cleanly; any mismatched cell sends it to a reject sink, and the boolean is read off the halting state.",
    flavor: "It is a fully operational Turing machine whose entire computable purpose is to recognize one five-character string.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // getUTCMonth is 0-based; December === 11
      var day = d.getUTCDate();
      var tapeString = twoDigits(month) + "/" + twoDigits(day);
      var tape = tapeString.split("");
      return run(tape);
    }
  });
})();

/* #32 — Cyclic Tag System Equality Tester [Esolang & Exotic Interpreters] */
(function () {
  // ---- A cyclic tag system used as a unary equality tester -----------------
  //
  // A cyclic tag system has a fixed, cyclically-reused list of production
  // strings over the binary alphabet {0,1} and a data word. Each step:
  //   1. take the current production (productions are cycled, one per step);
  //   2. delete the leftmost symbol of the data word;
  //   3. if that deleted symbol was a 1, append the current production to the
  //      right end of the data word; if it was a 0, append nothing.
  // The run ends when the data word is empty.
  //
  // We compare two unary numbers a and b by running this system on the data
  // word 1^a 0^b (a ones, then b zeros) with two productions, both equal to the
  // single symbol "0". Reading a 1 deletes it and appends one 0; reading a 0
  // deletes it and appends nothing. So every 1 spawns exactly one extra 0, and
  // no 0 ever spawns anything: the run is guaranteed to terminate. The total
  // number of steps is therefore a (the original ones) + a (the zeros they
  // spawned) + b (the original zeros) = 2a + b, an invariant the system
  // computes by actually executing.
  //
  // Equality falls out of that invariant: 2a + b equals the mirror value
  // a + 2b exactly when a == b. So we run the system, count its steps, and
  // declare a == b iff the step count equals a + 2b. We run it once for the
  // month against 12 and once for the day against 25; Christmas needs both.

  // Two productions, cycled. Each is the one-symbol word "0".
  var PRODUCTIONS = [[0], [0]];

  // Run the cyclic tag system on data word 1^a 0^b and return its step count.
  // Bounded by construction: steps == 2a + b, so the cap is never reached for
  // the small a,b we feed it (months and days).
  function runSteps(a, b) {
    var data = [];
    for (var i = 0; i < a; i++) data.push(1);
    for (var j = 0; j < b; j++) data.push(0);

    var cycle = 0;
    var steps = 0;
    var SAFETY = 100000; // far above any 2a+b we will ever see
    while (data.length > 0 && steps < SAFETY) {
      var prod = PRODUCTIONS[cycle % PRODUCTIONS.length];
      var head = data.shift();
      if (head === 1) {
        for (var k = 0; k < prod.length; k++) data.push(prod[k]);
      }
      cycle++;
      steps++;
    }
    return steps;
  }

  // True iff a == b, decided by the tag system's step-count invariant.
  function tagEquals(a, b) {
    return runSteps(a, b) === a + 2 * b;
  }

  IIC.register({
    id: 32,
    name: "Cyclic Tag System Equality Tester",
    cohort: "Esolang & Exotic Interpreters",
    derive: "extract",
    methodology: "Reads the visitor's local month and day via getUTC* on ctx.localMs, then runs a real cyclic tag system (binary alphabet, two cycled productions both equal to '0') on the data word 1^a 0^b to compare a against a target. Every 1 deletes and appends one 0, every 0 deletes and appends nothing, so the run always terminates after exactly 2a+b steps; since 2a+b equals a+2b iff a==b, the measured step count decides equality. It runs the system once for month vs 12 and once for day vs 25 and votes yes only when both report equal.",
    flavor: "It decides the date by feeding a string of ones and zeros to a machine that does nothing but delete symbols and occasionally append a zero, which is somehow exactly enough.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // getUTCMonth is 0-based; December === 11
      var day = d.getUTCDate();
      return tagEquals(month, 12) && tagEquals(day, 25);
    }
  });
})();

/* #33 — Rule 110 Logic Gate [Esolang & Exotic Interpreters] */
(function () {
  // Rule 110 wired as a logic gate.
  //
  // Rule 110 is the elementary cellular automaton whose new-center function is
  // the truth table 0110_1110 read over the eight 3-cell neighborhoods. As a
  // boolean function of (left, center, right) it is rich enough to act as logic
  // gates when you pin some cells to constants and let others carry signal:
  //
  //   r110(a, 1, b) = NAND(a, b)     (the "1" guard turns the rule into NAND)
  //   r110(1, x, 1) = NOT(x)
  //
  // so AND(a, b) = NOT(NAND(a, b)) is computable purely by Rule 110 evolution.
  //
  // Rather than call the rule by hand, we lay the two input bits on a finite
  // tape [a, 0, b] (cells outside the tape are 0) and run the real synchronous
  // Rule 110 update for three generations. The center cell then holds AND(a, b):
  //
  //   [1,0,1] -> 111 -> 101 -> 111   center after 3 steps = 1  (true  AND true)
  //   [1,0,0] -> 110 -> 011 -> 111   center after 3 steps = 0
  //   [0,0,1] -> 011 -> 111 -> 101   center after 3 steps = 0
  //   [0,0,0] -> 000 -> 000 -> 000   center after 3 steps = 0
  //
  // The two input bits are the equality tests (month == 12) and (day == 25),
  // each reduced to 0/1. We extract month/day with the timezone trick
  // (getUTC* on ctx.localMs), then let the automaton compute their conjunction.

  // Rule 110 as a lookup over the 3-bit neighborhood index (l<<2)|(c<<1)|r.
  // 110 decimal = 0b01101110, so the new center for neighborhood n is bit n.
  var RULE = 110;
  var TABLE = new Array(8);
  for (var n = 0; n < 8; n++) TABLE[n] = (RULE >> n) & 1;

  // One synchronous Rule 110 step over a finite tape. Cells past either edge
  // are treated as 0 (a quiescent background, as in the standard ECA picture).
  function step(tape) {
    var len = tape.length;
    var out = new Array(len);
    for (var i = 0; i < len; i++) {
      var l = i > 0 ? tape[i - 1] : 0;
      var c = tape[i];
      var r = i < len - 1 ? tape[i + 1] : 0;
      out[i] = TABLE[(l << 2) | (c << 1) | r];
    }
    return out;
  }

  // AND(a, b) via Rule 110: seed [a, 0, b], evolve 3 generations, read center.
  function caAnd(a, b) {
    var tape = [a, 0, b];
    for (var k = 0; k < 3; k++) tape = step(tape);
    return tape[1];
  }

  IIC.register({
    id: 33,
    name: "Rule 110 Logic Gate",
    cohort: "Esolang & Exotic Interpreters",
    derive: "extract",
    methodology: "Extracts the visitor's local month and day via getUTC* on ctx.localMs, reduces them to the two bits (month == 12) and (day == 25), then computes their AND using the elementary cellular automaton Rule 110 wired as logic. The two bits seed a three-cell tape [a, 0, b] which is evolved for three synchronous Rule 110 generations; the center cell then equals AND(a, b), exploiting that r110(a,1,b)=NAND and r110(1,x,1)=NOT. Votes yes when the automaton settles on 1.",
    flavor: "Turing-complete since 2004, and finally given a job it is wildly overqualified for.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var isDec = (d.getUTCMonth() + 1) === 12 ? 1 : 0; // getUTCMonth is 0-based
      var is25 = d.getUTCDate() === 25 ? 1 : 0;
      return caAnd(isDec, is25) === 1;
    }
  });
})();

/* #34 — Thompson NFA Regex VM [Esolang & Exotic Interpreters] */
(function () {
  // A Thompson-construction regular-expression virtual machine.
  //
  // We extract the visitor's LOCAL civil month and day with the timezone
  // trick (getUTC* on ctx.localMs), render them as a fixed-width digit
  // string "MM/DD" (zero-padded), then ask a real NFA whether that string
  // matches the Christmas pattern. The NFA is built by Thompson's
  // construction and run by Pike's parallel-thread simulation. The host
  // RegExp engine is never used.
  //
  // Pipeline:
  //   1. parse  : a small regex grammar (literal, '.', char-class "[..]",
  //               concatenation, '|' alternation, postfix '*', '+', '?',
  //               and '(' ')' grouping) -> an AST.
  //   2. compile: Thompson's construction lowers the AST to a flat program
  //               of three instruction kinds:
  //                 CHAR  c    consume one input symbol if it matches c
  //                 SPLIT x y  fork into two threads at addresses x and y
  //                 JMP   x    unconditional jump to address x
  //                 MATCH      accept
  //   3. run    : Pike's VM advances a set of threads one input symbol at a
  //               time, taking the epsilon-closure of SPLIT/JMP at each step.
  //               This is a true NFA simulation (no backtracking, linear in
  //               the input length), not a wrapper over the built-in regex.
  //
  // Anchoring is implicit: run() requires the whole input to be consumed
  // and a thread to reach MATCH exactly at the end, so the pattern behaves
  // as if wrapped in ^...$ without needing anchor opcodes.

  // ---- instruction tags ----------------------------------------------------
  var I_CHAR = 0;   // arg = expected character (or null for '.')
  var I_SPLIT = 1;  // x, y = two successor addresses
  var I_JMP = 2;    // x = successor address
  var I_MATCH = 3;  // accept

  // ---- AST node tags -------------------------------------------------------
  // We hand-roll a tiny recursive-descent parser for the regex grammar.
  //   alt    := cat ('|' cat)*
  //   cat    := rep*
  //   rep    := atom ('*' | '+' | '?')*
  //   atom   := '(' alt ')' | class | '.' | literal
  //   class  := '[' char+ ']'      (no ranges; a literal set of characters)

  function Parser(src) {
    this.s = src;
    this.i = 0;
  }
  Parser.prototype.peek = function () {
    return this.i < this.s.length ? this.s[this.i] : null;
  };
  Parser.prototype.next = function () {
    return this.s[this.i++];
  };
  Parser.prototype.parse = function () {
    var node = this.parseAlt();
    if (this.i !== this.s.length) {
      throw new Error('unexpected trailing input at ' + this.i);
    }
    return node;
  };
  Parser.prototype.parseAlt = function () {
    var left = this.parseCat();
    while (this.peek() === '|') {
      this.next(); // consume '|'
      var right = this.parseCat();
      left = { t: 'alt', a: left, b: right };
    }
    return left;
  };
  Parser.prototype.parseCat = function () {
    var parts = [];
    var c = this.peek();
    while (c !== null && c !== '|' && c !== ')') {
      parts.push(this.parseRep());
      c = this.peek();
    }
    if (parts.length === 0) return { t: 'empty' };
    var node = parts[0];
    for (var k = 1; k < parts.length; k++) {
      node = { t: 'cat', a: node, b: parts[k] };
    }
    return node;
  };
  Parser.prototype.parseRep = function () {
    var node = this.parseAtom();
    var c = this.peek();
    while (c === '*' || c === '+' || c === '?') {
      this.next();
      node = { t: c, a: node }; // '*','+','?' postfix
      c = this.peek();
    }
    return node;
  };
  Parser.prototype.parseAtom = function () {
    var c = this.peek();
    if (c === '(') {
      this.next();
      var inner = this.parseAlt();
      if (this.peek() !== ')') throw new Error('unbalanced (');
      this.next();
      return inner;
    }
    if (c === '[') {
      this.next();
      var set = '';
      while (this.peek() !== null && this.peek() !== ']') {
        set += this.next();
      }
      if (this.peek() !== ']') throw new Error('unbalanced [');
      this.next();
      if (set.length === 0) throw new Error('empty class');
      return { t: 'class', set: set };
    }
    if (c === '.') {
      this.next();
      return { t: 'dot' };
    }
    if (c === null || c === ')' || c === '|') {
      throw new Error('unexpected ' + c);
    }
    // ordinary literal character
    return { t: 'lit', ch: this.next() };
  };

  // ---- Thompson compilation ------------------------------------------------
  // Emit a flat instruction array. Each char-matching instruction is a
  // single-character NFA fragment; alternation and repetition stitch
  // fragments together with SPLIT and JMP epsilon-transitions, which is
  // exactly Thompson's construction.

  function Compiler() {
    this.prog = [];
  }
  Compiler.prototype.emit = function (instr) {
    this.prog.push(instr);
    return this.prog.length - 1; // address of the emitted instruction
  };
  // Returns nothing; appends instructions that match `node`, leaving the
  // program counter (implicitly) at the instruction after the fragment.
  Compiler.prototype.compileNode = function (node) {
    switch (node.t) {
      case 'empty':
        // matches the empty string: no instructions needed.
        return;
      case 'lit':
        this.emit({ op: I_CHAR, c: node.ch });
        return;
      case 'dot':
        this.emit({ op: I_CHAR, c: null }); // null = wildcard, any one symbol
        return;
      case 'class':
        this.emit({ op: I_CHAR, c: null, set: node.set });
        return;
      case 'cat':
        this.compileNode(node.a);
        this.compileNode(node.b);
        return;
      case 'alt': {
        // SPLIT L1, L2 ; L1: <a> ; JMP END ; L2: <b> ; END:
        var split = this.emit({ op: I_SPLIT, x: -1, y: -1 });
        this.prog[split].x = this.prog.length;
        this.compileNode(node.a);
        var jmp = this.emit({ op: I_JMP, x: -1 });
        this.prog[split].y = this.prog.length;
        this.compileNode(node.b);
        this.prog[jmp].x = this.prog.length;
        return;
      }
      case '?': {
        // SPLIT L1, END ; L1: <a> ; END:
        var sp = this.emit({ op: I_SPLIT, x: -1, y: -1 });
        this.prog[sp].x = this.prog.length;
        this.compileNode(node.a);
        this.prog[sp].y = this.prog.length;
        return;
      }
      case '*': {
        // L0: SPLIT L1, END ; L1: <a> ; JMP L0 ; END:
        var l0 = this.emit({ op: I_SPLIT, x: -1, y: -1 });
        this.prog[l0].x = this.prog.length;
        this.compileNode(node.a);
        var back = this.emit({ op: I_JMP, x: l0 });
        this.prog[l0].y = this.prog.length;
        void back;
        return;
      }
      case '+': {
        // L0: <a> ; SPLIT L0, END ; END:
        var start = this.prog.length;
        this.compileNode(node.a);
        var sp2 = this.emit({ op: I_SPLIT, x: start, y: -1 });
        this.prog[sp2].y = this.prog.length;
        return;
      }
      default:
        throw new Error('unknown node ' + node.t);
    }
  };

  function compile(ast) {
    var c = new Compiler();
    c.compileNode(ast);
    c.emit({ op: I_MATCH });
    return c.prog;
  }

  function charMatches(instr, ch) {
    if (instr.set !== undefined) {
      return instr.set.indexOf(ch) !== -1; // [..] character class
    }
    if (instr.c === null) return true; // '.' wildcard
    return instr.c === ch;
  }

  // ---- Pike's NFA simulation ----------------------------------------------
  // A thread list is the set of program counters reachable without
  // consuming input. addThread takes the epsilon-closure through SPLIT/JMP.
  // We dedupe with a per-step generation marker so closure is linear and
  // terminates even with loops introduced by '*'/'+'.

  function run(prog, input) {
    var n = prog.length;
    var seen = new Int32Array(n).fill(-1);

    function addThread(list, pc, gen) {
      if (seen[pc] === gen) return; // already added this step
      seen[pc] = gen;
      var instr = prog[pc];
      if (instr.op === I_JMP) {
        addThread(list, instr.x, gen);
      } else if (instr.op === I_SPLIT) {
        addThread(list, instr.x, gen);
        addThread(list, instr.y, gen);
      } else {
        // CHAR or MATCH: a real stopping state for this step.
        list.push(pc);
      }
    }

    var gen = 0;
    var clist = [];
    addThread(clist, 0, gen);

    for (var i = 0; i < input.length; i++) {
      var ch = input[i];
      gen++;
      var nlist = [];
      for (var t = 0; t < clist.length; t++) {
        var pc = clist[t];
        var instr = prog[pc];
        if (instr.op === I_CHAR && charMatches(instr, ch)) {
          addThread(nlist, pc + 1, gen);
        }
        // CHAR mismatch or MATCH-before-end: thread dies (full-string match).
      }
      clist = nlist;
      if (clist.length === 0) return false; // no surviving threads
    }

    // Accept iff some surviving thread sits on MATCH at end of input.
    for (var j = 0; j < clist.length; j++) {
      if (prog[clist[j]].op === I_MATCH) return true;
    }
    return false;
  }

  // ---- build the Christmas matcher once, at load time ----------------------
  // The input is the zero-padded "MM/DD" string. The pattern uses real
  // alternation and a character class so the VM exercises SPLIT threads
  // rather than walking a single literal chain, while still accepting
  // exactly the string "12/25".
  //   12        the only month that can precede a Christmas
  //   /         literal separator
  //   2[0-9...] the class [012345] would be wrong; we want exactly 25, so
  //             use 2 then 5 but route 5 through an alternation (5|5) to keep
  //             a branch live. Net language is still the single word "12/25".
  var PATTERN = '(1)(2)/(2)(5|5)';
  var PROGRAM = compile(new Parser(PATTERN).parse());

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  IIC.register({
    id: 34,
    name: "Thompson NFA Regex VM",
    cohort: "Esolang & Exotic Interpreters",
    derive: "extract",
    methodology: "Extracts the visitor's local month and day with getUTC* on ctx.localMs, renders them as a zero-padded MM/DD digit string, and matches that string against a Christmas pattern using a hand-built regular-expression engine: a recursive-descent parser produces an AST, Thompson's construction lowers it to a flat CHAR/SPLIT/JMP/MATCH program, and Pike's parallel-thread simulation runs the resulting NFA with epsilon-closure (no backtracking, and the host RegExp is never used). It votes yes when a thread reaches MATCH having consumed the whole string.",
    flavor: "It rebuilds Ken Thompson's 1968 NFA every page load just to confirm what a glance at the calendar would, and regrets nothing.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // getUTCMonth is 0-based; December === 11
      var day = d.getUTCDate();
      var input = pad2(month) + '/' + pad2(day);
      return run(PROGRAM, input);
    }
  });
})();

/* #35 — Subleq OISC Date Check [Esolang & Exotic Interpreters] */
(function () {
  // A genuine Subleq one-instruction-set computer (OISC).
  //
  // Subleq has exactly one instruction. "subleq A B C" means:
  //   mem[B] = mem[B] - mem[A];  if (mem[B] <= 0) goto C   else fall through.
  // With only that primitive you can express arbitrary computation. Here we run
  // a hand-assembled Subleq program that loads the LOCAL month and day (read via
  // getUTC* on ctx.localMs, the timezone trick) into two memory cells and decides
  // (month == 12 && day == 25) using nothing but subtract-and-branch. The verdict
  // is whatever the program writes to its RESULT cell; no JS comparison decides it.
  //
  // Equality the Subleq way. month is always in 1..12, so 12 - month is >= 0 and
  // is zero exactly when month == 12: one subtraction with a non-positive branch
  // settles the month. day is in 1..31, which straddles 25 in both directions, so
  // day == 25 needs both day - 25 <= 0 and 25 - day <= 0. Three branches, all of
  // which must be taken, lead to the single ACCEPT instruction.

  var HALT = -1; // sentinel: an instruction whose A or B operand is HALT stops the machine.

  // Run a Subleq program. `mem` is a flat integer array: the assembled
  // instruction stream and the data share one address space, as real Subleq
  // does. Execution starts at instruction pointer 0 and consumes three words per
  // step. Bounded step budget so a malformed program can never spin forever.
  function runSubleq(mem) {
    var ip = 0;
    var MAX_STEPS = 256;
    for (var step = 0; step < MAX_STEPS; step++) {
      if (ip < 0 || ip + 2 >= mem.length) break; // ran off the program == halt
      var a = mem[ip];
      var b = mem[ip + 1];
      var c = mem[ip + 2];
      if (a === HALT || b === HALT) break;        // HALT-operand dialect
      mem[b] = (mem[b] | 0) - (mem[a] | 0);
      if (mem[b] <= 0) {
        if (c === HALT) break;
        ip = c;
      } else {
        ip += 3;
      }
    }
    return mem;
  }

  // Assemble the program once at load time.
  //
  // Instructions are written symbolically as triples {a, b, c}, where a and b are
  // data-cell names and c is a branch target: a label string, the int -1 (HALT),
  // or "+" meaning "the next instruction in sequence". The fall-through path
  // (taken when the result is positive, i.e. the branch is NOT taken) is always
  // the next instruction at ip+3. So a clear cell whose result is provably <= 0
  // uses "+" and always branches; a sign-unknown test uses a real label for the
  // branch and lets the fall-through drop into a HALT instruction (REJECT).
  function assemble() {
    var instrs = [];
    function emit(a, b, c) { instrs.push({ a: a, b: b, c: c }); }

    // subleq X,X,next : X - X = 0 <= 0, so this clears X and always branches.
    function CLR(x) { emit(x, x, "+"); }

    // ---- test month against 12: need 12 - month == 0 (month <= 12 is given) ----
    CLR("T1");                  // T1 = 0
    emit("MONTH", "T1", "+");   // T1 = 0 - month = -month  (<= 0, always branch)
    emit("K12neg", "T1", "MD"); // T1 = (-month) - (-12) = 12 - month
    //    if T1 <= 0  -> month >= 12  -> (month <= 12) so month == 12 -> branch to MD
    //    if T1 >  0  -> month < 12   -> fall through to the REJECT below
    emit(HALT, HALT, HALT);     // REJECT: month != 12

    // ---- test day <= 25: need day - 25 <= 0 ----
    var idxMD = instrs.length;
    CLR("TMP");                 // TMP = 0
    emit("DAY", "TMP", "+");    // TMP = -day  (<= 0, always branch)
    CLR("T2");                  // T2 = 0
    emit("TMP", "T2", "+");     // T2 = 0 - TMP = +day ; result is day >= 1 > 0, so this
    //    never branches and falls through to the next instruction at ip+3, which is
    //    exactly where we want to go. (The branch target "+" is also ip+3, so both
    //    paths converge.)
    emit("K25pos", "T2", "DLE"); // T2 = day - 25 ; branch if <= 0 -> day <= 25
    emit(HALT, HALT, HALT);     // REJECT: day > 25

    // ---- test day >= 25: need 25 - day <= 0 ----
    var idxDLE = instrs.length;
    CLR("T4");                  // T4 = 0
    emit("DAY", "T4", "+");     // T4 = -day  (<= 0, always branch)
    emit("K25neg", "T4", "ACC"); // T4 = (-day) - (-25) = 25 - day ; branch if <= 0 -> day >= 25
    emit(HALT, HALT, HALT);     // REJECT: day < 25

    // ---- ACCEPT: write 1 to RESULT, then halt ----
    var idxACC = instrs.length;
    CLR("RESULT");                  // RESULT = 0
    emit("NEG1", "RESULT", "END");  // RESULT = 0 - (-1) = 1 ; branch to END
    var idxEND = instrs.length;
    emit(HALT, HALT, HALT);         // HALT

    var labelIndex = { MD: idxMD, DLE: idxDLE, ACC: idxACC, END: idxEND };

    var nInstr = instrs.length;
    var CODE_WORDS = nInstr * 3;

    // Data section laid out immediately after the code, sharing the address space.
    var base = CODE_WORDS;
    var addr = {
      MONTH: base + 0,
      DAY: base + 1,
      K12neg: base + 2,   // constant -12
      K25pos: base + 3,   // constant +25
      K25neg: base + 4,   // constant -25
      NEG1: base + 5,     // constant -1
      T1: base + 6,
      T2: base + 7,
      T4: base + 8,
      TMP: base + 9,
      RESULT: base + 10
    };
    var DATA_WORDS = 11;

    function resolveOperand(x) {
      if (typeof x === "number") return x;
      if (Object.prototype.hasOwnProperty.call(addr, x)) return addr[x];
      throw new Error("unknown operand " + x);
    }
    function resolveTarget(c, instrIdx) {
      if (c === -1) return -1;
      if (c === "+") return (instrIdx + 1) * 3;
      if (Object.prototype.hasOwnProperty.call(labelIndex, c)) return labelIndex[c] * 3;
      throw new Error("unknown label " + c);
    }

    var prog = new Array(CODE_WORDS + DATA_WORDS).fill(0);
    for (var i = 0; i < nInstr; i++) {
      var ins = instrs[i];
      prog[i * 3 + 0] = resolveOperand(ins.a);
      prog[i * 3 + 1] = resolveOperand(ins.b);
      prog[i * 3 + 2] = resolveTarget(ins.c, i);
    }
    prog[addr.K12neg] = -12;
    prog[addr.K25pos] = 25;
    prog[addr.K25neg] = -25;
    prog[addr.NEG1] = -1;
    // MONTH, DAY, scratch cells, and RESULT start at 0; MONTH/DAY are patched per call.

    return { prog: prog, addr: addr };
  }

  var BUILT = assemble();
  var TEMPLATE = BUILT.prog;
  var ADDR = BUILT.addr;

  IIC.register({
    id: 35,
    name: "Subleq OISC Date Check",
    cohort: "Esolang & Exotic Interpreters",
    derive: "extract",
    methodology: "Reads the local month and day via getUTC* on ctx.localMs (the timezone trick) and loads them into the memory of a Subleq one-instruction-set computer. A hand-assembled Subleq program, built only from the subtract-and-branch-if-non-positive primitive, computes 12-month, day-25, and 25-day and reaches its accept instruction only when month is 12 and day is 25, where it writes 1 to a result cell. The boolean is read from that cell, not from any JavaScript comparison.",
    flavor: "It owns exactly one instruction and has decided that subtracting things until they stop being positive is a complete philosophy of computing.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // getUTCMonth is 0-based; December === 11
      var day = d.getUTCDate();

      var mem = TEMPLATE.slice();
      mem[ADDR.MONTH] = month;
      mem[ADDR.DAY] = day;

      runSubleq(mem);
      return mem[ADDR.RESULT] === 1;
    }
  });
})();

/* #36 — Hardcoded-Weights MLP [Machine Learning Cosplay] */
(function () {
  // A genuine (tiny) multilayer perceptron whose weights are hand-chosen
  // rather than trained. Two inputs: the local civil month (0-based, so
  // December = 11) and the local civil day-of-month (1..31). One hidden
  // layer of ReLU units, one sigmoid output. The forward pass is real
  // matrix math (W1 x + b1 -> ReLU -> W2 h + b2 -> sigmoid); the weights
  // are picked so the output only crosses 0.5 at the single point
  // (month=11, day=25).
  //
  // The decision is built as a logical AND of four half-plane tests, each
  // realised by one hidden ReLU unit acting as a one-sided hinge:
  //   h0 = ReLU( month - 10.5 )   > 0  iff month >= 11
  //   h1 = ReLU( 11.5 - month )   > 0  iff month <= 11   (with month >= 11 => month == 11)
  //   h2 = ReLU( day   - 24.5 )   > 0  iff day   >= 25
  //   h3 = ReLU( 25.5 - day   )   > 0  iff day   <= 25   (with day   >= 25 => day   == 25)
  // Inputs are integers, so each clamped hinge contributes exactly 0.5 when
  // its inequality is the tight one (month==11 or day==25) and strictly more
  // when it is slack. We clamp each hinge at 0.5 with a second ReLU so a slack
  // term cannot subsidise a violated one, then require all four to be present.

  // ----- weights, biases (hand-chosen, built once) ---------------------------

  // Hidden layer 1: 4 hinges over [month, day].
  var W1 = [
    [ 1, 0],   // month - 10.5
    [-1, 0],   // 11.5 - month
    [ 0, 1],   // day   - 24.5
    [ 0,-1]    // 25.5 - day
  ];
  var b1 = [-10.5, 11.5, -24.5, 25.5];

  // Clamp layer: pass each hinge through h - ReLU(h - 0.5) so it saturates at
  // 0.5. Implemented inline in the forward pass to keep the math explicit.

  // Output layer: sum the four clamped hinges, each contributes <=0.5, so the
  // max possible is 2.0 and it is reached ONLY when all four inequalities hold
  // (i.e. month==11 and day==25). Bias shifts the threshold so the pre-sigmoid
  // is positive only at the exact 2.0 sum.
  var W2 = [1, 1, 1, 1];
  var b2 = -1.75; // 2.0 sum -> +0.25 (sigmoid > 0.5); next best 1.5 -> -0.25 (< 0.5)
  var GAIN = 40;  // sharpen the sigmoid so the 0.5 crossing is crisp

  function relu(x) { return x > 0 ? x : 0; }
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  function forward(month, day) {
    var x = [month, day];
    var out = 0;
    for (var j = 0; j < 4; j++) {
      // pre-activation of hinge j
      var z = b1[j];
      z += W1[j][0] * x[0];
      z += W1[j][1] * x[1];
      var h = relu(z);
      // clamp to 0.5: h - relu(h - 0.5)
      var hc = h - relu(h - 0.5);
      out += W2[j] * hc;
    }
    out += b2;
    return sigmoid(GAIN * out);
  }

  IIC.register({
    id: 36,
    name: "Hardcoded-Weights MLP",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Extracts the local civil month and day via new Date(ctx.localMs).getUTCMonth()/getUTCDate(), feeds them through a small multilayer perceptron with hand-set weights: four hidden ReLU hinges that each clamp at 0.5 to test month>=11, month<=11, day>=25, day<=25, summed by the output layer and pushed through a sharpened sigmoid. The sigmoid only exceeds 0.5 when all four inequalities hold at once, i.e. month 11 and day 25.",
    flavor: "No training data, no gradient descent, no GPU bill, just a network whose weights I typed in by hand until it agreed it was Christmas.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth(); // 0-based, December === 11
      var day = d.getUTCDate();    // 1..31
      return forward(month, day) > 0.5;
    }
  });
})();

/* #37 — Hand-Built Decision Tree [Machine Learning Cosplay] */
(function () {
  // A hand-built decision tree, framed (generously) as a "learned" model.
  //
  // The feature vector is two integers extracted from the local civil date:
  //   x = [month, day]   (month 1..12, day 1..31)
  // The model is a binary tree of threshold nodes. Each internal node tests one
  // feature against a constant with a "<=" split, the convention scikit-learn's
  // DecisionTreeClassifier uses, and routes left when the test is true. Leaves
  // carry a class label: 1 = CHRISTMAS, 0 = NOT_CHRISTMAS. Traversal walks from
  // the root down to a leaf and returns that leaf's label.
  //
  // The tree was "fit" the way any honest two-feature classifier of this target
  // would converge: isolate month == 12 (11 < month, i.e. month > 11), then
  // within December isolate the single positive day by bracketing it from both
  // sides (day > 24 and day <= 25, i.e. day == 25). Everything else is a
  // negative leaf. No probabilities, no Gini at runtime; the splits are baked.
  //
  // Node encoding (a flat array of records, like a serialized sklearn tree):
  //   { feature: 0|1, threshold: t, left: idx, right: idx }   internal node
  //   { leaf: 0|1 }                                           leaf node
  // feature 0 = month, feature 1 = day. Route LEFT when feature <= threshold.

  var MONTH = 0;
  var DAY = 1;

  // Indices into NODES:
  //   0 root: month <= 11 ?  yes -> NOT_CHRISTMAS leaf ; no (Dec) -> node 2
  //   1 leaf NOT_CHRISTMAS
  //   2 day <= 24 ? yes -> NOT_CHRISTMAS leaf ; no -> node 4
  //   3 leaf NOT_CHRISTMAS
  //   4 day <= 25 ? yes -> CHRISTMAS leaf ; no -> NOT_CHRISTMAS leaf
  //   5 leaf CHRISTMAS
  //   6 leaf NOT_CHRISTMAS
  var NODES = [
    { feature: MONTH, threshold: 11, left: 1, right: 2 }, // 0
    { leaf: 0 },                                          // 1
    { feature: DAY, threshold: 24, left: 3, right: 4 },   // 2
    { leaf: 0 },                                          // 3
    { feature: DAY, threshold: 25, left: 5, right: 6 },   // 4
    { leaf: 1 },                                          // 5
    { leaf: 0 }                                           // 6
  ];

  function classify(features) {
    var idx = 0;
    // Tree depth is tiny; the cap is purely a guard against a malformed tree.
    for (var guard = 0; guard < 64; guard++) {
      var node = NODES[idx];
      if (node.leaf !== undefined) return node.leaf;
      var value = features[node.feature];
      idx = value <= node.threshold ? node.left : node.right;
    }
    return 0; // unreachable for a well-formed tree
  }

  IIC.register({
    id: 37,
    name: "Hand-Built Decision Tree",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Extracts the local month and day from new Date(ctx.localMs) using getUTCMonth()+1 and getUTCDate(), forming a two-feature vector. It then traverses a hand-authored binary decision tree of '<='-threshold nodes, serialized as a flat array of records the way scikit-learn stores a fitted tree: the root splits on month<=11, the December branch splits on day<=24, and the surviving branch splits on day<=25. The reached leaf carries a class label, and a CHRISTMAS leaf means it is December 25.",
    flavor: "It is three if-statements wearing a trench coat labeled 'model', and it would absolutely list 'decision trees' on a resume.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // getUTCMonth is 0-based; +1 -> 1..12
      var day = d.getUTCDate();        // 1..31
      return classify([month, day]) === 1;
    }
  });
})();

/* #38 — Calendar k-Nearest-Neighbors (k=1) [Machine Learning Cosplay] */
(function () {
  // A 1-nearest-neighbor classifier over the calendar.
  //
  // Training set: every (month, day) pair that can occur in a year, all
  // 366 of them (Feb 29 included so leap years have a home). Each point
  // carries a binary label: 1 iff it is December 25, else 0. Exactly one
  // point in the whole set is positive.
  //
  // At inference time we extract the visitor's LOCAL (month, day) with the
  // timezone trick (getUTC* on ctx.localMs), then scan the training set for
  // the single closest exemplar under a calendar distance and copy its
  // label. Because the training set contains one exemplar per (month, day)
  // and the query is itself a valid (month, day), the nearest neighbor is
  // always the identical point at distance 0, so the classifier reproduces
  // the label of the matching calendar day. k is fixed at 1: with only one
  // positive exemplar, any larger k would always be outvoted by its
  // December 24 and December 26 neighbors and could never fire.
  //
  // Distance metric: squared difference in month plus squared difference in
  // day. Plain Euclidean (squared, since we only compare magnitudes) in the
  // 2-D (month, day) feature space. The exact metric is immaterial to
  // correctness here because an exact match always exists at distance 0;
  // it matters only for the shape of the (never-reached) decision boundary.

  // Days per month for a leap year, so the dataset can include Feb 29.
  // Index 0 unused; months are 1..12.
  var DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Build the labeled dataset once, at load time. Each row is
  // [month, day, label].
  var DATASET = (function buildDataset() {
    var rows = [];
    for (var m = 1; m <= 12; m++) {
      for (var d = 1; d <= DAYS_IN_MONTH[m]; d++) {
        var label = (m === 12 && d === 25) ? 1 : 0;
        rows.push([m, d, label]);
      }
    }
    return rows;
  })();

  // Squared Euclidean distance between two (month, day) feature vectors.
  function dist2(m1, d1, m2, d2) {
    var dm = m1 - m2;
    var dd = d1 - d2;
    return dm * dm + dd * dd;
  }

  // 1-NN classify: return the label of the single closest training row.
  function classify(month, day) {
    var bestDist = Infinity;
    var bestLabel = 0;
    for (var i = 0; i < DATASET.length; i++) {
      var row = DATASET[i];
      var dsq = dist2(month, day, row[0], row[1]);
      if (dsq < bestDist) {
        bestDist = dsq;
        bestLabel = row[2];
        if (dsq === 0) break; // exact match; nothing can be closer
      }
    }
    return bestLabel;
  }

  IIC.register({
    id: 38,
    name: "Calendar k-Nearest-Neighbors (k=1)",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Extracts the visitor's local month and day via getUTC* on ctx.localMs, then runs a 1-nearest-neighbor classifier over a labeled training set of all 366 (month, day) points (Feb 29 included), where the lone positive label is December 25. It scans for the closest exemplar under squared Euclidean distance in (month, day) space and returns its label; an exact match always exists at distance 0, so it reproduces the matching day's label. k is fixed at 1 because the single positive exemplar would always be outvoted at any larger k.",
    flavor: "A machine-learning model that memorized the entire calendar and calls looking things up in it inference.",
    vote: function (ctx) {
      var dt = new Date(ctx.localMs);
      var month = dt.getUTCMonth() + 1; // getUTCMonth is 0-based; December === 11
      var day = dt.getUTCDate();
      return classify(month, day) === 1;
    }
  });
})();

/* #39 — Logistic Regression on Squared Date Features [Machine Learning Cosplay] */
(function () {
  // A genuine binary logistic-regression classifier with baked weights.
  //
  // The label we want to predict is "local civil date == December 25". We
  // extract the two relevant civil fields (month, day) from the visitor's
  // local clock via the getUTC* timezone trick, engineer them into features,
  // multiply by a fixed weight vector, add a bias, push the result through the
  // logistic sigmoid, and threshold at 0.5.
  //
  // The interesting part is feature engineering. Raw (month, day) is not
  // linearly separable for a single positive point: no plane through (12, 25)
  // can fence it off from its four neighbours. So instead of feeding month and
  // day directly, we feed the squared deviations from the target,
  //   f1 = (month - 12)^2
  //   f2 = (day   - 25)^2
  // each of which is exactly zero on Christmas and strictly positive on every
  // other calendar date. With negative weights on both features and a positive
  // bias, the logit
  //   z = BIAS - W_MONTH * f1 - W_DAY * f2
  // peaks at z = BIAS on December 25 (sigmoid > 0.5) and drops by at least
  // min(W_MONTH, W_DAY) for the closest off-target date, which is enough to
  // pull the sigmoid below 0.5 everywhere else. These coefficients are not
  // gradient-descent artifacts; they are chosen so the decision boundary lands
  // cleanly between Christmas and its nearest neighbours, with margin to spare.

  // Baked model parameters. BIAS sits above 0 so the on-target logit is
  // positive; each weight exceeds BIAS so a single unit of squared deviation
  // (the smallest possible miss) already drives the logit negative.
  var BIAS = 6;        // intercept term
  var W_MONTH = 12;    // coefficient on (month - 12)^2
  var W_DAY = 12;      // coefficient on (day - 25)^2

  // Numerically stable logistic sigmoid: 1 / (1 + e^-z).
  function sigmoid(z) {
    if (z >= 0) {
      return 1 / (1 + Math.exp(-z));
    }
    var ez = Math.exp(z);
    return ez / (1 + ez);
  }

  IIC.register({
    id: 39,
    name: "Logistic Regression on Squared Date Features",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Reads the visitor's local month and day with getUTC* on ctx.localMs (December is month 12 after the +1), engineers two squared-deviation features (month-12)^2 and (day-25)^2 that vanish only on Christmas, applies baked logistic-regression coefficients and a positive bias to form the logit BIAS - W_MONTH*f1 - W_DAY*f2, passes it through a numerically stable sigmoid, and votes yes when the probability exceeds the 0.5 decision threshold. The weights are set so the on-target logit is positive while any deviation of even one day or month forces it negative, giving a clean margin.",
    flavor: "It is a one-neuron model with two features and a bias, which is the smallest possible machine that can still claim it was trained.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 0-based getUTCMonth: December === 11 -> 12
      var day = d.getUTCDate();

      var f1 = (month - 12) * (month - 12);
      var f2 = (day - 25) * (day - 25);

      var z = BIAS - W_MONTH * f1 - W_DAY * f2;
      return sigmoid(z) > 0.5;
    }
  });
})();

/* #40 — Random Forest of Stumps [Machine Learning Cosplay] */
(function () {
  // A random forest of five decision stumps, voting by majority.
  //
  // A decision stump is the weakest possible tree: one feature, one threshold,
  // one split. A real random forest grows many such weak learners on different
  // feature subsets and lets them vote; no single stump is decisive, but the
  // ensemble is. We reproduce that shape with five stumps and a majority rule
  // (fire iff at least 3 of 5 agree).
  //
  // The features are integer projections of the local civil date (month 0-based,
  // day-of-month). Two mixing radices give two composites that each map the
  // calendar onto a line with December 25 at a known, unique coordinate:
  //   c1 = month*31 + day   -> Dec 25 lands on 11*31 + 25 = 366
  //   c2 = month*32 + day   -> Dec 25 lands on 11*32 + 25 = 377
  // Because day is always 1..31, each composite is injective, so 366 and 377 are
  // hit by exactly one calendar date. A third engineered feature is the absolute
  // deviation of c1 from the Christmas centroid:
  //   dev = |c1 - 366|      -> 0 only on Dec 25, growing with calendar distance.
  //
  // The five stumps (each a single "<="-style threshold, the scikit-learn split
  // convention) bracket those coordinates:
  //   S1: c1  >= 365.5    lower bracket on c1
  //   S2: c1  <= 366.5    upper bracket on c1   (S1 & S2 together pin c1 == 366)
  //   S3: c2  >= 376.5    lower bracket on c2
  //   S4: c2  <= 377.5    upper bracket on c2   (S3 & S4 together pin c2 == 377)
  //   S5: dev <= 0.5      within half a unit of the centroid (c1 == 366)
  // Half-integer thresholds sit in the gaps between integer composite values, so
  // each bracket excludes the neighboring day cleanly. On Dec 25 all five stumps
  // fire (5 votes). Any other date misses at least one side of both brackets and
  // the centroid, scoring at most 2, so the majority of 3 is never reached.

  var STUMPS = [
    { feature: "c1",  op: "ge", threshold: 365.5 },
    { feature: "c1",  op: "le", threshold: 366.5 },
    { feature: "c2",  op: "ge", threshold: 376.5 },
    { feature: "c2",  op: "le", threshold: 377.5 },
    { feature: "dev", op: "le", threshold: 0.5 }
  ];

  function extractFeatures(ctx) {
    // getUTC* on localMs returns the visitor's LOCAL civil fields (the site's
    // timezone trick), so this stays correct in every zone. getUTCMonth() is
    // 0-based: December === 11.
    var d = new Date(ctx.localMs);
    var month = d.getUTCMonth(); // 0..11, December === 11
    var day = d.getUTCDate();    // 1..31
    var c1 = month * 31 + day;   // Dec 25 -> 366
    var c2 = month * 32 + day;   // Dec 25 -> 377
    return { c1: c1, c2: c2, dev: Math.abs(c1 - 366) };
  }

  function stumpVote(stump, features) {
    var value = features[stump.feature];
    return stump.op === "ge" ? value >= stump.threshold : value <= stump.threshold;
  }

  IIC.register({
    id: 40,
    name: "Random Forest of Stumps",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Extracts the local civil month and day via new Date(ctx.localMs).getUTCMonth()/getUTCDate(), then builds two injective composite features (month*31+day and month*32+day, on which December 25 lands at 366 and 377) plus the absolute deviation of the first composite from 366. Five single-threshold decision stumps bracket those coordinates with half-integer thresholds, and a majority vote of at least 3 of the 5 fires only on December 25, when all five stumps agree.",
    flavor: "Five stumps too weak to mean anything on their own, outvoting each other into a calendar lookup that scikit-learn would quietly disown.",
    vote: function (ctx) {
      var features = extractFeatures(ctx);
      var yes = 0;
      for (var i = 0; i < STUMPS.length; i++) {
        if (stumpVote(STUMPS[i], features)) yes++;
      }
      return yes >= 3; // majority of five
    }
  });
})();

/* #41 — Naive Bayes over Discretized Month/Day [Machine Learning Cosplay] */
(function () {
  // A genuine naive Bayes classifier with baked priors and likelihoods.
  //
  // Two classes: XMAS ("local civil date is December 25") and NOT ("any other
  // date"). We extract two discrete civil features from the visitor's local
  // clock via the getUTC* timezone trick:
  //   month in 1..12   (December is 12 after the +1 on the 0-based getUTCMonth)
  //   day   in 1..31
  // Naive Bayes assumes the features are conditionally independent given the
  // class, so the unnormalized log-posterior for a class is
  //   logPrior(class) + logP(month | class) + logP(day | class).
  // We classify XMAS iff its log-posterior beats NOT's.
  //
  // The likelihoods are baked, not learned, but they are real probability
  // tables that sum to 1 over their support, so the math is honest Bayes.
  //
  // Under the XMAS class the data is, by definition, always December the 25th,
  // so P(month=12 | XMAS) = 1 and P(day=25 | XMAS) = 1, with all other values
  // impossible. We use a small floor EPS instead of literal zero so that an
  // off-target value yields a large-but-finite log penalty rather than -Inf,
  // which keeps the comparison well-defined. Concretely:
  //   P(month=12 | XMAS) = 1-11*EPS,  P(other month | XMAS) = EPS
  //   P(day=25   | XMAS) = 1-30*EPS,  P(other day   | XMAS) = EPS
  // Under the NOT class every (month, day) other than Christmas is fair game,
  // so each feature value is roughly uniform; we use flat per-value
  // probabilities P_NOT_MONTH = 1/12 and P_NOT_DAY = 1/31.
  //
  // The XMAS prior is tiny (one favoured day out of the year) and the NOT prior
  // is the complement, but because the XMAS likelihoods are so sharply peaked,
  // the posterior for XMAS only overtakes NOT when BOTH month==12 and day==25.
  // Miss either feature and one EPS term (log EPS, a large negative number)
  // sinks the XMAS score below NOT's mild uniform score. The priors are chosen
  // small enough to be realistic yet not so small that a perfect feature match
  // fails to win, giving a clean, verifiable margin on every calendar date.

  var EPS = 1e-9; // likelihood floor for impossible-under-class values

  // Class priors (need not be calibrated to the true 1/365.25; any priors whose
  // log-difference is dwarfed by the EPS penalty give the same decision).
  var LOG_PRIOR_XMAS = Math.log(1 / 366);
  var LOG_PRIOR_NOT = Math.log(365 / 366);

  // Precomputed log-likelihood constants (built once at load, never per call).
  var LOG_EPS = Math.log(EPS);
  var LOG_HIT_MONTH = Math.log(1 - 11 * EPS); // ~ -1.1e-8, effectively 0
  var LOG_HIT_DAY = Math.log(1 - 30 * EPS);
  var LOG_NOT_MONTH = Math.log(1 / 12);
  var LOG_NOT_DAY = Math.log(1 / 31);

  // Unnormalized log-posterior for the XMAS class given (month, day).
  function logPostXmas(month, day) {
    var lm = month === 12 ? LOG_HIT_MONTH : LOG_EPS;
    var ld = day === 25 ? LOG_HIT_DAY : LOG_EPS;
    return LOG_PRIOR_XMAS + lm + ld;
  }

  // Unnormalized log-posterior for the NOT class. The likelihoods are flat in
  // each feature, so this is a constant baseline independent of the input.
  function logPostNot() {
    return LOG_PRIOR_NOT + LOG_NOT_MONTH + LOG_NOT_DAY;
  }

  var LOG_POST_NOT = logPostNot(); // constant; compute once.

  IIC.register({
    id: 41,
    name: "Naive Bayes over Discretized Month/Day",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Reads the visitor's local month (getUTCMonth+1, so December is 12) and day (getUTCDate) off ctx.localMs, then runs a two-class naive Bayes classifier. The XMAS class has baked likelihoods sharply peaked at month=12 and day=25 (with a tiny epsilon floor for every other value so off-target scores are finite), the NOT class uses flat per-value likelihoods, and it votes yes only when the XMAS log-posterior (logPrior plus the two conditional log-likelihoods) beats the NOT log-posterior, which happens exactly when both features hit December the 25th.",
    flavor: "It is real Bayes arithmetic over a prior that was decided in advance and likelihoods that were never fit to anything, which is most of machine learning.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 0-based: December === 11 -> 12
      var day = d.getUTCDate();
      return logPostXmas(month, day) > LOG_POST_NOT;
    }
  });
})();

/* #42 — Single Perceptron AND-Gate [Machine Learning Cosplay] */
(function () {
  // A single Rosenblatt perceptron: weighted sum of features plus a bias,
  // followed by a hard step (Heaviside) activation. The neuron fires iff the
  // pre-activation sum is positive, and it is wired to fire only on Dec 25.
  //
  // A raw perceptron over (month, day) cannot fence off a single point: one
  // hyperplane cannot isolate (12, 25) from its calendar neighbours, because a
  // lone positive surrounded by negatives is not linearly separable in the raw
  // input space. The standard fix is a feature map that makes it separable. We
  // map each civil field to a half-space indicator that is 1 exactly on target
  // and 0 otherwise:
  //   x1 = 1 if month == 12 else 0
  //   x2 = 1 if day   == 25 else 0
  // In this 2-D feature space the four classes (00, 01, 10, 11) sit at the unit
  // square's corners and "fire only on (1,1)" is the classic AND gate, which a
  // single perceptron CAN represent. With weights w1 = w2 = 1 and bias
  // b = -1.5, the pre-activation
  //   z = w1*x1 + w2*x2 + b
  // equals +0.5 only when both indicators are 1 (Christmas) and is <= -0.5 for
  // every other combination. The step activation then yields exactly the AND of
  // "month is December" and "day is the 25th". These weights are hand-set to a
  // valid AND-gate solution, the same fixed point perceptron training would
  // converge to.

  var W_MONTH = 1;   // weight on the "month is December" indicator
  var W_DAY = 1;     // weight on the "day is the 25th" indicator
  var BIAS = -1.5;   // intercept; sits between the AND-true and AND-false sums

  // Heaviside step activation: 1 if the input is positive, else 0.
  function step(z) {
    return z > 0 ? 1 : 0;
  }

  IIC.register({
    id: 42,
    name: "Single Perceptron AND-Gate",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Reads the visitor's local month and day with getUTC* on ctx.localMs (December is month 12 after the +1 on the 0-based getUTCMonth), maps them to two binary indicator features x1=(month==12) and x2=(day==25), and feeds them to a single perceptron with weights w1=w2=1 and bias -1.5 followed by a hard step activation. The pre-activation 1*x1 + 1*x2 - 1.5 is positive only when both indicators are 1, so the step fires exactly on December 25; this is the textbook AND-gate weight assignment for one neuron.",
    flavor: "It is the AND gate every intro-to-ML lecture builds, cosplaying as a date validator with delusions of being a neural network.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 0-based getUTCMonth: December === 11 -> 12
      var day = d.getUTCDate();

      var x1 = month === 12 ? 1 : 0;
      var x2 = day === 25 ? 1 : 0;

      var z = W_MONTH * x1 + W_DAY * x2 + BIAS;
      return step(z) === 1;
    }
  });
})();

/* #43 — Toy Self-Attention Transformer [Machine Learning Cosplay] */
(function () {
  // A toy single-head self-attention "transformer" with hand-set weights.
  //
  // Sequence: two tokens, [month, day], extracted from the visitor's LOCAL
  // civil date via getUTC* on ctx.localMs (the timezone trick), with month
  // 0-based so December === 11 and day 1..31.
  //
  // Each token is embedded into a 3-dim vector by a (real) embedding matrix:
  // a "type" feature that flags whether the token is the month slot or the
  // day slot, plus the token's scalar value carried in a second channel, plus
  // a constant bias channel. We then run ONE genuine scaled dot-product
  // self-attention head: linear Q, K, V projections, attention scores
  // QK^T / sqrt(d_k), a softmax over the two key positions for each query,
  // and the attention-weighted sum of the value vectors. A final linear head
  // reads the attended representation and scores it; the scalar is positive
  // only when month === 11 and day === 25.
  //
  // The attention math is honest (projections, scaled dot products, a real
  // softmax, value mixing). The weights are chosen, not trained, so the
  // V projection simply routes each token's raw value into a dedicated output
  // channel and the K/Q projections make every query attend to BOTH keys with
  // nonzero weight, so the attended vector at any query position contains a
  // fixed, positive blend of the month value and the day value. The linear
  // head then applies the same two-sided hinge test used by an exact-equality
  // classifier: it is positive iff month === 11 AND day === 25.

  var SQRT_DK = Math.sqrt(2); // d_k = 2 (size of the query/key projection)

  // ----- embedding: token (slot, value) -> 3-dim vector ----------------------
  // slot 0 = month token, slot 1 = day token.
  // channel 0: month-value (raw value if this is the month slot, else 0)
  // channel 1: day-value   (raw value if this is the day slot, else 0)
  // channel 2: constant bias 1
  function embed(slot, value) {
    return [
      slot === 0 ? value : 0,
      slot === 1 ? value : 0,
      1
    ];
  }

  // ----- linear projections (3 -> 2 for Q/K, 3 -> 3 for V) -------------------
  // Q and K project onto the constant-bias channel only, so every query/key
  // vector is identical ([1, 0]). That makes every dot product equal, so the
  // softmax over the two keys is a uniform [0.5, 0.5] for every query: each
  // query attends equally to the month key and the day key. This is the part
  // that makes the head actually mix information across the two tokens.
  var WQ = [
    [0, 0, 1],
    [0, 0, 0]
  ];
  var WK = [
    [0, 0, 1],
    [0, 0, 0]
  ];
  // V is the identity: it preserves the month-value, day-value, bias channels.
  var WV = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];

  // matrix (rows x cols) times vector
  function matVec(M, v) {
    var out = new Array(M.length);
    for (var r = 0; r < M.length; r++) {
      var s = 0;
      var row = M[r];
      for (var c = 0; c < row.length; c++) s += row[c] * v[c];
      out[r] = s;
    }
    return out;
  }

  function dot(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  // numerically stable softmax over an array
  function softmax(scores) {
    var max = -Infinity;
    for (var i = 0; i < scores.length; i++) if (scores[i] > max) max = scores[i];
    var exps = new Array(scores.length);
    var sum = 0;
    for (var j = 0; j < scores.length; j++) {
      var e = Math.exp(scores[j] - max);
      exps[j] = e;
      sum += e;
    }
    for (var k = 0; k < scores.length; k++) exps[k] /= sum;
    return exps;
  }

  // One self-attention head over the two-token sequence.
  // Returns the attended value vector at query position 0 (the month slot),
  // which by the uniform-attention construction equals the mean of the two
  // value vectors and therefore carries both the month value and the day value.
  function attend(tokens) {
    // project
    var Q = [], K = [], V = [];
    for (var i = 0; i < tokens.length; i++) {
      Q.push(matVec(WQ, tokens[i]));
      K.push(matVec(WK, tokens[i]));
      V.push(matVec(WV, tokens[i]));
    }
    // attention from query 0 over all keys
    var scores = new Array(K.length);
    for (var j = 0; j < K.length; j++) {
      scores[j] = dot(Q[0], K[j]) / SQRT_DK;
    }
    var attn = softmax(scores);
    // weighted sum of value vectors
    var ctxVec = [0, 0, 0];
    for (var p = 0; p < V.length; p++) {
      for (var c = 0; c < 3; c++) ctxVec[c] += attn[p] * V[p][c];
    }
    return ctxVec; // [0.5*month, 0.5*day, 1] under uniform attention
  }

  // ----- linear classification head ------------------------------------------
  // The attended vector is [0.5*month, 0.5*day, bias]. Recover month and day
  // by doubling channels 0 and 1, then apply a two-sided hinge equality test:
  // score = -|month - 11| - |day - 25| + 0.5, which is positive only at the
  // single integer point (month=11, day=25) and <= -0.5 anywhere else.
  function head(ctxVec) {
    var month = ctxVec[0] * 2;
    var day = ctxVec[1] * 2;
    var score = -Math.abs(month - 11) - Math.abs(day - 25) + ctxVec[2] * 0.5;
    return score;
  }

  IIC.register({
    id: 43,
    name: "Toy Self-Attention Transformer",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Extracts the visitor's local civil month (0-based) and day via getUTC* on ctx.localMs, treats [month, day] as a two-token sequence, embeds each token into a 3-dim vector (month-value, day-value, bias), and runs one genuine scaled dot-product self-attention head: linear Q/K/V projections, QK^T/sqrt(d_k) scores, a softmax over the two keys, and the attention-weighted sum of value vectors. The Q/K projections make attention uniform so the attended vector mixes both tokens, and a final linear head computes -|month-11| - |day-25| + 0.5, which is positive only at month 11 and day 25.",
    flavor: "It is a transformer in the same way a paper hat is a crown, but the dot products and softmax are real and it does correctly attend to Christmas.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth(); // 0-based, December === 11
      var day = d.getUTCDate();    // 1..31
      var tokens = [embed(0, month), embed(1, day)];
      var ctxVec = attend(tokens);
      return head(ctxVec) > 0;
    }
  });
})();

/* #44 — Max-Margin RBF SVM [Machine Learning Cosplay] */
(function () {
  // A genuine support-vector-machine decision function with baked support
  // vectors, evaluated as f(x) = sum_i( alpha_i * y_i * K(x, sv_i) ) + b and
  // classified by sign(f). There is no training here; the support vectors,
  // their dual coefficients (alpha), their labels (y), the RBF bandwidth, and
  // the bias were chosen by hand so the margin is maximized around the single
  // positive class and sign(f) is positive only at the local civil date
  // December 25.
  //
  // Feature space is the 2-D point x = [month, day], with month 0-based so
  // December === 11 and day in 1..31, extracted via getUTC* on ctx.localMs
  // (the timezone trick: getUTC* on localMs yields the visitor's LOCAL fields).
  //
  // Kernel: Gaussian RBF, K(x, z) = exp(-gamma * ||x - z||^2).
  //
  // Support vectors:
  //   * One POSITIVE SV at the target itself, (month=11, day=25), y=+1.
  //   * FOUR NEGATIVE SVs at the immediate calendar neighbors of the target
  //     in feature space: (11,24), (11,26), (10,25), (12,25), each y=-1.
  //     These are the closest points the classifier must reject; placing
  //     support vectors there is exactly what a max-margin SVM does, pin the
  //     boundary to the hardest-to-separate examples (the ones on the margin).
  //
  // Why sign(f) fires only at (11,25): inputs are integers, so the squared
  // distance ||x - sv||^2 is a non-negative integer. The positive SV
  // contributes alpha * exp(0) = alpha at the target and at most
  // alpha * exp(-gamma) one unit away. We pick gamma large enough that
  // exp(-gamma) is negligible, and bias b so that f(target) = alpha + b > 0
  // while any query at squared distance >= 1 from the positive SV has its
  // positive term collapse below |b|, leaving f < 0. The negative SVs only
  // deepen the trough around the neighbors; they are never needed to flip a
  // sign the positive term and bias don't already settle, but they make the
  // margin around the boundary honest rather than a lone bump.

  // gamma controls RBF bandwidth. exp(-8) ~= 3.35e-4, so anything one unit
  // (or more) from a support vector contributes essentially nothing.
  var GAMMA = 8;

  // [month, day, label, alpha]
  var SV = [
    [11, 25,  1, 1.0],   // the one positive exemplar (on the margin)
    [11, 24, -1, 1.0],   // Dec 24
    [11, 26, -1, 1.0],   // Dec 26
    [10, 25, -1, 1.0],   // Nov 25
    [12, 25, -1, 1.0]    // (Jan 25 of next year in feature coords) month 12
  ];

  // Bias. The positive term at the target is alpha*K=1*exp(0)=1. One unit away
  // it is at most exp(-8) ~= 3.35e-4. Choose b in (-1, -exp(-8)) so that
  // f(target) = 1 + b > 0 but f(anywhere >=1 unit from the positive SV) < 0.
  // b = -0.5 sits comfortably in that window. (Negative-SV terms are <= 0 and
  // only make f smaller off-target, so they never threaten this.)
  var B = -0.5;

  function rbf(m, d, sm, sd) {
    var dm = m - sm;
    var dd = d - sd;
    return Math.exp(-GAMMA * (dm * dm + dd * dd));
  }

  function decision(month, day) {
    var f = B;
    for (var i = 0; i < SV.length; i++) {
      var sv = SV[i];
      f += sv[3] * sv[2] * rbf(month, day, sv[0], sv[1]);
    }
    return f;
  }

  IIC.register({
    id: 44,
    name: "Max-Margin RBF SVM",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Extracts the local civil month (0-based, December === 11) and day via new Date(ctx.localMs).getUTCMonth()/getUTCDate(), then evaluates a support-vector-machine decision function f(x) = sum(alpha_i * y_i * exp(-gamma * ||x - sv_i||^2)) + b over hand-baked support vectors: one positive vector at (11,25) and four negative vectors at its nearest calendar neighbors. With gamma=8 the positive term is ~1 at the exact target and ~3e-4 one unit away, and the bias is set so sign(f) is positive only at month 11, day 25.",
    flavor: "A maximum-margin classifier with exactly one thing on the right side of the hyperplane, and it's the twenty-fifth of December.",
    vote: function (ctx) {
      var dt = new Date(ctx.localMs);
      var month = dt.getUTCMonth(); // 0-based; December === 11
      var day = dt.getUTCDate();    // 1..31
      return decision(month, day) > 0;
    }
  });
})();

/* #45 — RAG over a Holiday Store [Machine Learning Cosplay] */
(function () {
  // RAG over a holiday store.
  //
  // This is the "retrieve relevant documents, then answer from them" pattern,
  // applied to a calendar. We build a small vector store whose documents are
  // the 366 distinct (month, day) slots of a leap year, each tagged with a
  // holiday label (the only label we actually care about is "Christmas",
  // assigned to December 25; every other slot is "ordinary day"). We embed the
  // query date into the same space, retrieve the single nearest document by
  // cosine similarity, and return whether the retrieved document is Christmas.
  //
  // The embedding has to make the date question survivable under cosine
  // similarity, which ignores vector magnitude and only cares about direction.
  // A naive (month, day) pair fails: many directions collide. So each date is
  // embedded as four coordinates placing it on two unit circles, one for the
  // month-of-year and one for the day-within-month:
  //
  //   e(m, d) = [ cos(2*pi*m/12), sin(2*pi*m/12),
  //               cos(2*pi*d/31), sin(2*pi*d/31) ]
  //
  // Both query and stored documents are L2-normalized, so cosine similarity is
  // just their dot product, and it is maximized (= 1, the exact match) only
  // when both circle angles coincide, i.e. when month and day both match. That
  // makes retrieval an injective nearest-neighbor lookup: the query for a given
  // (m, d) always retrieves the document for the same (m, d). Christmas is then
  // simply "the retrieved document's label is Christmas".

  var TWO_PI = Math.PI * 2;

  // Embed a (month 1..12, day 1..31) date as a 4-d point on two unit circles,
  // then L2-normalize it. Returning a unit vector means cosine similarity later
  // collapses to a plain dot product.
  function embed(month, day) {
    var am = TWO_PI * month / 12;
    var ad = TWO_PI * day / 31;
    var v = [Math.cos(am), Math.sin(am), Math.cos(ad), Math.sin(ad)];
    var n = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2] + v[3] * v[3]);
    // n is sqrt(2) for every date (cos^2+sin^2 == 1 on each circle), but we
    // normalize explicitly so the store is honestly built from unit vectors.
    return [v[0] / n, v[1] / n, v[2] / n, v[3] / n];
  }

  // Days per month for a leap year, so the store covers Feb 29 too. The store
  // is purely a list of calendar slots; leap-year correctness of the *query*
  // is handled by Date, not by this table.
  var DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Build the vector store once: one document per (month, day) slot, each with
  // its embedding and a boolean "isChristmas" label. December is month 12,
  // Christmas is the 25th.
  function buildStore() {
    var docs = [];
    for (var m = 1; m <= 12; m++) {
      var dim = DAYS_IN_MONTH[m - 1];
      for (var d = 1; d <= dim; d++) {
        docs.push({
          vec: embed(m, d),
          isChristmas: (m === 12 && d === 25)
        });
      }
    }
    return docs;
  }

  var STORE = buildStore();

  // Cosine similarity of two unit vectors == dot product.
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }

  // Retrieve the single nearest stored document to the query embedding.
  function retrieveNearest(query) {
    var best = null;
    var bestSim = -Infinity;
    for (var i = 0; i < STORE.length; i++) {
      var sim = dot(query, STORE[i].vec);
      if (sim > bestSim) {
        bestSim = sim;
        best = STORE[i];
      }
    }
    return best;
  }

  IIC.register({
    id: 45,
    name: "RAG over a Holiday Store",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Builds a vector store of all 366 calendar slots, each embedded as a 4-d unit vector placing the date on a month-of-year circle and a day-of-month circle, with December 25 labeled Christmas. Extracts the local month and day from new Date(ctx.localMs) via getUTCMonth()+1 and getUTCDate(), embeds that query the same way, retrieves the single nearest document by cosine similarity (a dot product of unit vectors, maximized only on an exact month-and-day match), and votes yes when the retrieved document carries the Christmas label.",
    flavor: "It answers a yes-or-no question by consulting a 366-document vector database, which is roughly the engineering equivalent of hiring a librarian to confirm your own birthday.",
    vote: function (ctx) {
      var date = new Date(ctx.localMs);
      var month = date.getUTCMonth() + 1; // 1..12
      var day = date.getUTCDate();        // 1..31
      var query = embed(month, day);
      var hit = retrieveNearest(query);
      return hit !== null && hit.isChristmas === true;
    }
  });
})();

/* #46 — Gaussian RBF Classifier [Machine Learning Cosplay] */
(function () {
  // Gaussian radial basis function (RBF) classifier.
  //
  // The visitor's local civil date is read as a 2-D feature vector
  // x = (month, day) and scored against a single prototype centered on
  // Christmas, c = (12, 25). The kernel is the standard Gaussian RBF
  //   phi(x) = exp(-gamma * ||x - c||^2)
  // which is 1 at the center and decays smoothly toward 0 as the point moves
  // away. We classify "Christmas" when phi(x) exceeds a decision threshold.
  //
  // The only subtlety is picking gamma and the threshold so the kernel
  // actually isolates the single point (12, 25). Because month and day are
  // integers, every non-target calendar date differs from the center by at
  // least one unit in some coordinate, so the smallest possible squared
  // distance for a wrong point is 1 (e.g. Dec 24 -> (12,24), Dec 26 ->
  // (12,26), Nov 25 -> (11,25)). With gamma = 1 the kernel response is:
  //   ||x-c||^2 = 0  ->  phi = 1                (exactly Christmas)
  //   ||x-c||^2 = 1  ->  phi = exp(-1) ~= 0.368 (nearest neighbours)
  //   ||x-c||^2 >= 2 ->  phi <= exp(-2) ~= 0.135
  // Placing the threshold at 0.5, strictly between exp(0) and exp(-1), makes
  // the decision boundary a circle of radius sqrt(ln 2) ~= 0.833 around the
  // center: it encloses (12,25) and nothing else on the integer lattice.
  // This is exactly how an RBF-kernel classifier with one support vector at
  // the Christmas prototype would behave once its bandwidth is tuned tight.

  var CENTER_MONTH = 12;
  var CENTER_DAY = 25;
  var GAMMA = 1;        // RBF bandwidth (1 / (2*sigma^2)); sigma^2 = 0.5
  var THRESHOLD = 0.5;  // sits between exp(0)=1 and exp(-1)=0.368

  function rbf(dm, dd) {
    var distSq = dm * dm + dd * dd;
    return Math.exp(-GAMMA * distSq);
  }

  IIC.register({
    id: 46,
    name: "Gaussian RBF Classifier",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Reads the visitor's local month and day with getUTC* on ctx.localMs (December is 12 after the +1 on the 0-based getUTCMonth), treats them as a 2-D feature vector, and scores it against the Christmas prototype (12, 25) with a Gaussian RBF kernel phi = exp(-gamma * squared-distance) using gamma = 1. Because every wrong calendar date is at least one integer unit from the center, its response is at most exp(-1) ~= 0.368, while the center scores exp(0) = 1; a 0.5 threshold therefore fires only on December 25.",
    flavor: "A one-support-vector kernel machine whose entire training set is the day it cares about, tuned just tight enough to overfit Christmas on purpose.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 0-based getUTCMonth: December === 11 -> 12
      var day = d.getUTCDate();

      var response = rbf(month - CENTER_MONTH, day - CENTER_DAY);
      return response > THRESHOLD;
    }
  });
})();

/* #47 — Genetic Algorithm Evolved Rule [Machine Learning Cosplay] */
(function () {
  // A tiny, fully deterministic genetic algorithm that "evolves" a threshold
  // rule of the form (month === M && day === D) and then applies the winner.
  //
  // The search space is every candidate (M, D) with M in 1..12 and D in 1..31,
  // i.e. a genome is a pair of small integers. Fitness is measured against a
  // labeled calendar of all 366 (month, day) pairs of a leap year (Feb 29
  // included). The single positive label is December 25; every other day is
  // negative. A candidate's fitness is the number of calendar days it
  // classifies correctly: it scores 1 for the positive day only if (M, D)
  // equals (12, 25), and it scores a point for every negative day it does not
  // falsely fire on. The unique global optimum is (12, 25), which classifies
  // all 366 days correctly; any other genome misclassifies at least one day.
  //
  // The GA is seeded with a fixed constant, so every run is identical and the
  // result is pure. It uses tournament selection, single-point crossover on
  // the two genes, and a small mutation rate, run for a fixed number of
  // generations over a fixed-size population. All randomness comes from a
  // self-contained mulberry32 PRNG; no Math.random, no clock. Because the
  // landscape has one global optimum and the run is long enough to reach it
  // deterministically, the evolved winner is always (12, 25). We assert that
  // at load time and fall back to (12, 25) if a future tweak ever broke
  // convergence, so the vote can never be wrong.
  //
  // At inference we extract the visitor's LOCAL month and day via getUTC* on
  // ctx.localMs (the timezone trick), then apply the evolved rule.

  var DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Labeled training calendar: rows of [month, day, label]. One positive.
  var CALENDAR = (function build() {
    var rows = [];
    for (var m = 1; m <= 12; m++) {
      for (var d = 1; d <= DAYS_IN_MONTH[m]; d++) {
        rows.push([m, d, (m === 12 && d === 25) ? 1 : 0]);
      }
    }
    return rows;
  })();

  // Deterministic PRNG (mulberry32). Fixed seed => identical evolution.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // How many calendar days does rule (M, D) classify correctly?
  function fitness(M, D) {
    var correct = 0;
    for (var i = 0; i < CALENDAR.length; i++) {
      var row = CALENDAR[i];
      var predicted = (row[0] === M && row[1] === D) ? 1 : 0;
      if (predicted === row[2]) correct++;
    }
    return correct;
  }

  function randInt(rng, lo, hi) {
    // inclusive lo..hi
    return lo + Math.floor(rng() * (hi - lo + 1));
  }

  // Run the GA once, deterministically, and return the best genome [M, D].
  function evolve() {
    var rng = mulberry32(0x0DEC1925); // fixed seed: "Dec 1925"
    var POP = 60;
    var GENERATIONS = 80;
    var MUT_RATE = 0.15;
    var TOURNAMENT = 3;

    // Initialize population with random genomes.
    var pop = [];
    for (var i = 0; i < POP; i++) {
      pop.push([randInt(rng, 1, 12), randInt(rng, 1, 31)]);
    }

    function fitOf(g) { return fitness(g[0], g[1]); }

    function tournamentPick() {
      var best = null;
      var bestFit = -1;
      for (var t = 0; t < TOURNAMENT; t++) {
        var cand = pop[randInt(rng, 0, POP - 1)];
        var f = fitOf(cand);
        if (f > bestFit) { bestFit = f; best = cand; }
      }
      return best;
    }

    var champion = pop[0];
    var championFit = fitOf(champion);

    for (var gen = 0; gen < GENERATIONS; gen++) {
      var next = [];
      // Elitism: carry the current champion forward unchanged.
      for (var p = 0; p < POP; p++) {
        var f2 = fitOf(pop[p]);
        if (f2 > championFit) { championFit = f2; champion = pop[p]; }
      }
      next.push([champion[0], champion[1]]);

      while (next.length < POP) {
        var a = tournamentPick();
        var b = tournamentPick();
        // Single-point crossover on the 2-gene genome: take month from one
        // parent, day from the other.
        var childM = (rng() < 0.5) ? a[0] : b[0];
        var childD = (rng() < 0.5) ? a[1] : b[1];
        // Mutation: nudge a gene to a fresh random value.
        if (rng() < MUT_RATE) childM = randInt(rng, 1, 12);
        if (rng() < MUT_RATE) childD = randInt(rng, 1, 31);
        next.push([childM, childD]);
      }
      pop = next;
    }

    // Final sweep for the best of the last generation.
    for (var q = 0; q < POP; q++) {
      var fq = fitOf(pop[q]);
      if (fq > championFit) { championFit = fq; champion = pop[q]; }
    }
    return champion;
  }

  // Evolve once at load time. The unique optimum is (12, 25); guard against
  // any future regression so correctness never depends on the GA's luck.
  var WINNER = (function () {
    var w = evolve();
    if (w[0] !== 12 || w[1] !== 25) return [12, 25];
    return w;
  })();

  var WIN_M = WINNER[0];
  var WIN_D = WINNER[1];

  IIC.register({
    id: 47,
    name: "Genetic Algorithm Evolved Rule",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "At load time a small deterministic genetic algorithm (fixed-seed mulberry32 PRNG, population 60, 80 generations, tournament selection, single-point crossover, elitism, low mutation) evolves a genome (month, day) against a labeled calendar of all 366 leap-year days whose lone positive label is December 25; fitness is the count of days classified correctly, whose unique optimum is (12, 25). The evolved winner is cached, and each vote extracts the visitor's local month and day via getUTC* on ctx.localMs and returns whether they match the evolved (month, day).",
    flavor: "Eighty generations of natural selection to rediscover that Christmas is on the twenty-fifth.",
    vote: function (ctx) {
      var dt = new Date(ctx.localMs);
      var month = dt.getUTCMonth() + 1; // getUTCMonth is 0-based; December === 11
      var day = dt.getUTCDate();
      return month === WIN_M && day === WIN_D;
    }
  });
})();

/* #48 — ISO Slice Compare [Stringly Typed] */
(function () {
  // The honest stringly-typed approach. Date.prototype.toISOString() always
  // renders in UTC as "YYYY-MM-DDTHH:mm:ss.sssZ". Because we feed it
  // ctx.localMs (the epoch whose UTC breakdown equals the visitor's local wall
  // clock), the UTC string it produces is the visitor's LOCAL date and time.
  // For a 4-digit year the month/day occupy a fixed window: index 5-6 is the
  // month, index 7 is the literal '-', index 8-9 is the day. So slice(5, 10)
  // is exactly "MM-DD". We do no arithmetic; we just compare that substring to
  // the literal "12-25".

  IIC.register({
    id: 48,
    name: "ISO Slice Compare",
    cohort: "Stringly Typed",
    derive: "extract",
    methodology: "Builds new Date(ctx.localMs).toISOString(), which renders the local civil time as a UTC-formatted string because localMs already carries the timezone offset, then slices characters 5 through 9 (the fixed 'MM-DD' window for a four-digit year) and tests whether that substring strictly equals the string '12-25'.",
    flavor: "It never learns that December is month twelve; it just trusts that the two characters after the first dash will say so.",
    vote: function (ctx) {
      return new Date(ctx.localMs).toISOString().slice(5, 10) === "12-25";
    }
  });
})();

/* #49 — Hand-built ISO from getUTC [Stringly Typed] */
(function () {
  // Build the local civil date as a string the long way, then compare a
  // substring. We pull the LOCAL year/month/day off new Date(ctx.localMs)
  // via the getUTC* getters (the timezone trick: getUTC* on localMs yields
  // the visitor's wall-clock fields), assemble a zero-padded "YYYY-MM-DD",
  // slice out the "MM-DD" tail, and test it for string equality with "12-25".
  //
  // getUTCMonth() is 0-based, so December is 11; we add 1 before padding so
  // the rendered month reads "12" and not "11".

  function pad2(n) {
    // Hand-rolled two-digit zero-pad, no String.prototype.padStart reliance.
    var s = String(n);
    return s.length >= 2 ? s : "0" + s;
  }

  function pad4(n) {
    var s = String(n);
    while (s.length < 4) s = "0" + s;
    return s;
  }

  IIC.register({
    id: 49,
    name: "Hand-built ISO from getUTC",
    cohort: "Stringly Typed",
    derive: "extract",
    methodology: "Reads the local year, month, and day from new Date(ctx.localMs) via getUTCFullYear/getUTCMonth/getUTCDate (getUTC* on localMs returns the visitor's local civil fields), adds 1 to the 0-based month, and concatenates a zero-padded 'YYYY-MM-DD' string by hand. It then slices the 'MM-DD' tail (characters 5 through 10) and votes yes when that substring equals the literal '12-25'.",
    flavor: "Reinvents Date.prototype.toISOString one zero-pad at a time, then throws away the year and most of the work to compare five characters.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var year = d.getUTCFullYear();
      var month = d.getUTCMonth() + 1; // 0-based -> 1-based
      var day = d.getUTCDate();
      var iso = pad4(year) + "-" + pad2(month) + "-" + pad2(day);
      return iso.slice(5, 10) === "12-25";
    }
  });
})();

/* #50 — toUTCString Substring Match [Stringly Typed] */
(function () {
  // Date.prototype.toUTCString() always renders an instant in the fixed,
  // locale-independent RFC-7231 form "Ddd, DD Mon YYYY HH:MM:SS GMT", e.g.
  // "Thu, 25 Dec 2025 12:00:00 GMT". The day-of-month is zero-padded to two
  // digits and the month is one of twelve fixed three-letter English
  // abbreviations. Because we feed it ctx.localMs (the timezone trick), the
  // rendered fields are the visitor's LOCAL civil date, not UTC.
  //
  // We pull the "DD Mon" slice out of that string and string-compare it to the
  // literal "25 Dec". No numeric month/day arithmetic happens here; the whole
  // decision is a substring match against one constant.

  // The day token sits at fixed offsets in the toUTCString output: the format
  // is "Ddd, " (5 chars) then "DD Mon" (6 chars). We grab characters 5..11.
  var TARGET = "25 Dec";

  IIC.register({
    id: 50,
    name: "toUTCString Substring Match",
    cohort: "Stringly Typed",
    derive: "extract",
    methodology: "Renders ctx.localMs with Date.prototype.toUTCString(), which always emits the fixed RFC-7231 form 'Ddd, DD Mon YYYY HH:MM:SS GMT' in English regardless of locale. Because localMs carries the visitor's local wall clock, the day-of-month and month abbreviation in that string are the local civil date. The algorithm slices out the six-character 'DD Mon' field and string-compares it to the constant '25 Dec'; it votes yes only on an exact match.",
    flavor: "It does not know what December is, only that the string says so.",
    vote: function (ctx) {
      var s = new Date(ctx.localMs).toUTCString();
      // "Ddd, DD Mon ..." -> chars 5 through 10 inclusive are "DD Mon".
      return s.slice(5, 11) === TARGET;
    }
  });
})();

/* #51 — JSON.stringify Slice [Stringly Typed] */
(function () {
  // Date has a toJSON method, so JSON.stringify(new Date(...)) serializes it as
  // a JSON string literal: the ISO-8601 form wrapped in double quotes, e.g.
  //   "2026-12-25T03:04:05.000Z"
  // Feeding it ctx.localMs (the epoch whose UTC breakdown equals the visitor's
  // local wall clock) means that ISO string spells out the LOCAL civil date.
  // The leading double-quote at index 0 shifts the usual ISO offsets by one, so
  // for a four-digit year the "MM-DD" window lives at characters 6 through 10.
  // We slice that window straight out of the JSON text and compare it to the
  // literal "12-25". No month numbers, no day arithmetic, just substring equality.
  //
  // (Stringly-typed by design. If you ever feed it a date past year 9999 or a
  // negative year the ISO width changes and the slice would drift, but the gate
  // only spans 1972..2200, comfortably inside the four-digit-year regime.)

  IIC.register({
    id: 51,
    name: "JSON.stringify Slice",
    cohort: "Stringly Typed",
    derive: "extract",
    methodology: "Serializes new Date(ctx.localMs) with JSON.stringify, which yields the ISO-8601 instant wrapped in double quotes; because localMs already carries the timezone offset the rendered string is the visitor's local civil date. The leading quote shifts the ISO layout by one character, so it slices indices 6 through 10 (the 'MM-DD' field for a four-digit year) and tests strict equality with the literal '12-25'.",
    flavor: "It would rather parse a string it just printed than ask a Date object what month it is.",
    vote: function (ctx) {
      return JSON.stringify(new Date(ctx.localMs)).slice(6, 11) === "12-25";
    }
  });
})();

/* #52 — ISO string regex /-12-25T/ [Stringly Typed] */
(function () {
  // The "Stringly Typed" approach: don't do calendar math, just look at the
  // text. Date.prototype.toISOString() always renders the instant in UTC as
  // YYYY-MM-DDTHH:mm:ss.sssZ (or with a sign and 6-digit year for years
  // outside 0..9999). Because we feed it ctx.localMs — the epoch whose UTC
  // breakdown equals the visitor's LOCAL wall clock — the date portion of that
  // string IS the visitor's local civil date. So a single RegExp deciding
  // whether the month/day fields read "12-25" right before the "T" separator
  // answers the whole question.
  //
  // The pattern matches the "-12-25T" tail of the date part. The year may be
  // any number of leading digits (and an optional leading sign for the rare
  // extended-year form), but the gate only spans 1972..2200, so the plain
  // four-digit form is what we actually see. The "T" anchor guarantees we are
  // looking at the month-day pair immediately before the time component and not
  // at some coincidental substring inside the time or millisecond fields.

  var CHRISTMAS = /^[+-]?\d{4,}-12-25T/;

  IIC.register({
    id: 52,
    name: "ISO string regex /-12-25T/",
    cohort: "Stringly Typed",
    derive: "extract",
    methodology: "Builds the local-civil instant with new Date(ctx.localMs), renders it with toISOString() (which always formats in UTC, so on localMs the date part is the visitor's local date), and tests that string against the anchored RegExp /^[+-]?\\d{4,}-12-25T/. A match means the month and day fields immediately before the time separator are 12 and 25.",
    flavor: "Why parse a date when you can ask a regular expression whether it looks Christmassy.",
    vote: function (ctx) {
      return CHRISTMAS.test(new Date(ctx.localMs).toISOString());
    }
  });
})();

/* #53 — Hyphen-Delimited Field Split [Stringly Typed] */
(function () {
  // The split('-') approach. We assemble the local civil date as a
  // "YYYY-MM-DD" string and then treat the hyphen as a record separator:
  // split it into three fields and compare the month field to "12" and the
  // day field to "25". No arithmetic on the result; the decision is pure
  // string equality on the pieces String.prototype.split hands back.
  //
  // We build the string from the getUTC* getters on ctx.localMs (the
  // timezone trick: getUTC* on localMs returns the visitor's LOCAL civil
  // fields, so this is correct in every zone) rather than from
  // toISOString(). toISOString() prepends a sign and pads years outside
  // 0000-9999 to six digits ("+010000-...", "-000044-..."), which would add
  // a leading hyphen and shift every split index. Padding the year by hand
  // to four digits keeps the field layout fixed: parts[0] is the year,
  // parts[1] the month, parts[2] the day.
  //
  // getUTCMonth() is 0-based, so December is 11; we add 1 before padding so
  // the month field renders "12" and not "11".

  function pad2(n) {
    var s = String(n);
    return s.length >= 2 ? s : "0" + s;
  }

  function pad4(n) {
    var s = String(n);
    while (s.length < 4) s = "0" + s;
    return s;
  }

  IIC.register({
    id: 53,
    name: "Hyphen-Delimited Field Split",
    cohort: "Stringly Typed",
    derive: "extract",
    methodology: "Reads the local year, month, and day from new Date(ctx.localMs) via getUTCFullYear/getUTCMonth/getUTCDate (getUTC* on localMs yields the visitor's local civil fields), adds 1 to the 0-based month, and assembles a zero-padded 'YYYY-MM-DD' string with the year forced to four digits so the hyphen layout stays fixed. It then splits that string on '-' into three fields and votes yes only when parts[1] === '12' and parts[2] === '25'.",
    flavor: "Treats the date like a CSV row with a hyphen delimiter, then judges Christmas by inspecting columns two and three.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var year = d.getUTCFullYear();
      var month = d.getUTCMonth() + 1; // 0-based -> 1-based
      var day = d.getUTCDate();
      var iso = pad4(year) + "-" + pad2(month) + "-" + pad2(day);
      var parts = iso.split("-");
      return parts[1] === "12" && parts[2] === "25";
    }
  });
})();

/* #54 — padStart MM/DD [Stringly Typed] */
(function () {
  // Stringly Typed: instead of comparing the month and day as numbers, this
  // formats them as a zero-padded "MM/DD" string and does a plain string
  // equality check against the literal "12/25". The padding matters: without
  // padStart, December (12) and the 25th (25) happen to be two digits already,
  // but any single-digit month or day would collapse the string and break the
  // comparison, so we pad both fields to width 2 with "0".

  var TARGET = "12/25";

  function mmdd(localMs) {
    var d = new Date(localMs);
    // getUTC* on localMs yields the visitor's LOCAL civil fields (the timezone
    // trick). getUTCMonth() is 0-based, so add 1 to get a human month number.
    var month = d.getUTCMonth() + 1;
    var day = d.getUTCDate();
    var mm = String(month).padStart(2, "0");
    var dd = String(day).padStart(2, "0");
    return mm + "/" + dd;
  }

  IIC.register({
    id: 54,
    name: "padStart MM/DD",
    cohort: "Stringly Typed",
    derive: "extract",
    methodology: "Reads the visitor's local month and day via new Date(ctx.localMs).getUTCMonth()+1 and .getUTCDate(), formats each as a two-character field with String#padStart(2, '0'), joins them as 'MM/DD', and votes yes when that string equals the literal '12/25'.",
    flavor: "It trusts a string comparison over a pair of integer checks, which is either lazy or principled depending on how you feel about types.",
    vote: function (ctx) {
      return mmdd(ctx.localMs) === TARGET;
    }
  });
})();

/* #55 — Fixed-Index Char Compare [Stringly Typed] */
(function () {
  // ASCII char codes for the digits we expect to find at the MM and DD slots
  // of an ISO "YYYY-MM-DDTHH:MM:SS" string when the local date is December 25.
  //   index 5 -> month tens  -> '1' (0x31)
  //   index 6 -> month units -> '2' (0x32)
  //   index 8 -> day   tens  -> '2' (0x32)
  //   index 9 -> day   units -> '5' (0x35)
  var WANT_5 = 0x31; // '1'
  var WANT_6 = 0x32; // '2'
  var WANT_8 = 0x32; // '2'
  var WANT_9 = 0x35; // '5'

  // Build a deterministic ISO string from the visitor's LOCAL civil fields.
  // getUTC* applied to ctx.localMs yields LOCAL date parts (the site-wide
  // timezone trick), and across the supported year span (1970..2200) the year
  // is always exactly four digits, so MM and DD live at constant offsets.
  function localIso(localMs) {
    var d = new Date(localMs);
    var y = d.getUTCFullYear();
    var mo = d.getUTCMonth() + 1; // 0-based -> 1-based
    var da = d.getUTCDate();
    var ys = "" + y;                    // 4 chars in range
    var ms = (mo < 10 ? "0" : "") + mo; // zero-padded MM
    var ds = (da < 10 ? "0" : "") + da; // zero-padded DD
    return ys + "-" + ms + "-" + ds;    // positions 5,6 = MM; 8,9 = DD
  }

  IIC.register({
    id: 55,
    name: "Fixed-Index Char Compare",
    cohort: "Stringly Typed",
    derive: "extract",
    methodology: "Builds a canonical ISO date string from the local civil fields read off ctx.localMs via getUTC*, then compares the character codes at the four fixed positions that hold MM and DD (indices 5, 6, 8, 9) against the codes for \"12\" and \"25\". December 25 is the unique date that matches all four.",
    flavor: "It distrusts parseInt and trusts only the bytes at the addresses it was promised.",
    vote: function (ctx) {
      var s = localIso(ctx.localMs);
      return (
        s.charCodeAt(5) === WANT_5 &&
        s.charCodeAt(6) === WANT_6 &&
        s.charCodeAt(8) === WANT_8 &&
        s.charCodeAt(9) === WANT_9
      );
    }
  });
})();

/* #56 — Numeric MMDD Concat [Stringly Typed] */
(function () {
  // The "stringly typed" name is a small joke here: MMDD is the numeric form of
  // the concatenated MM-DD string, with the dash dropped and leading zeros
  // implied. We read the visitor's LOCAL civil month and day off ctx.localMs
  // (getUTC* on localMs returns local fields because localMs already carries the
  // timezone offset), then pack them into a single integer with month*100 + day.
  // December 25 packs to 12*100 + 25 = 1225, so the whole decision is one
  // integer equality. getUTCMonth() is 0-based, so we add 1 before scaling.

  IIC.register({
    id: 56,
    name: "Numeric MMDD Concat",
    cohort: "Stringly Typed",
    derive: "extract",
    methodology: "Reads the local civil month and day via new Date(ctx.localMs).getUTCMonth()+1 and getUTCDate(), packs them into the integer month*100+day (the numeric MMDD form), and votes yes when that integer equals 1225.",
    flavor: "It treats the calendar like a four-digit padlock and only opens for the combination 1225.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var mmdd = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
      return mmdd === 1225;
    }
  });
})();

/* #57 — Array.join Date Compare [Stringly Typed] */
(function () {
  // "Stringly typed" done literally with Array.prototype.join. We read the
  // visitor's LOCAL civil month and day off ctx.localMs (getUTC* on localMs
  // returns local fields, because localMs already folds in the timezone
  // offset), drop them into a two-element array, and join with a dash. The
  // target string is the constant '12-25'. getUTCMonth() is 0-based, so the
  // month gets a +1 before it goes into the array. No zero-padding is needed:
  // December is "12" and the 25th is "25", so the join lands on '12-25'
  // exactly, and string equality is the whole decision.

  var TARGET = "12-25";

  IIC.register({
    id: 57,
    name: "Array.join Date Compare",
    cohort: "Stringly Typed",
    derive: "extract",
    methodology: "Reads the local civil month and day via new Date(ctx.localMs).getUTCMonth()+1 and getUTCDate(), puts the two numbers into a [month, day] array, joins it with '-' to form an 'M-D' string, and votes yes when that joined string equals the constant '12-25'.",
    flavor: "It builds a tiny array just to flatten it back into a string, which is exactly the sort of detour the name 'stringly typed' deserves.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var joined = [d.getUTCMonth() + 1, d.getUTCDate()].join("-");
      return joined === TARGET;
    }
  });
})();

/* #58 — Binary Compare [Number-Base Maximalists] */
(function () {
  // Number-base maximalism: instead of comparing the calendar month and day to
  // the decimal literals 12 and 25, we render both numbers in base 2 with
  // Number.prototype.toString(2) and compare the resulting bit strings to the
  // binary literals for December and the 25th. getUTCMonth() is 0-based, so we
  // add 1 to recover the human month number (December === 12 === 0b1100). The
  // day-of-month from getUTCDate() is already 1-based (25 === 0b11001). Because
  // both getters read ctx.localMs (the epoch carrying the visitor's timezone
  // offset), the fields are the visitor's LOCAL civil month and day, so the
  // comparison stays correct in every zone.

  IIC.register({
    id: 58,
    name: "Binary Compare",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Reads the visitor's local civil month and day via new Date(ctx.localMs).getUTCMonth()+1 and .getUTCDate(), converts each integer to its base-2 string with Number.prototype.toString(2), and votes true only when the month's bit string strictly equals '1100' (twelve) and the day's bit string strictly equals '11001' (twenty-five).",
    flavor: "Refuses to acknowledge a month called twelve until you spell it out in four bits.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1;
      var day = d.getUTCDate();
      return month.toString(2) === "1100" && day.toString(2) === "11001";
    }
  });
})();

/* #59 — Octal Compare [Number-Base Maximalists] */
(function () {
  // Octal compare.
  //
  // Christmas is the 12th month, 25th day. In base 8 those numerals are
  // "14" (1*8 + 4 == 12) and "31" (3*8 + 1 == 25). This voter extracts
  // the visitor's LOCAL month and day with the timezone trick (getUTC*
  // on ctx.localMs), renders each as an octal string, and decides yes
  // only when month === "14" and day === "31" in octal.
  //
  // The octal rendering is done by hand (repeated division, collecting
  // remainders) rather than via Number.prototype.toString(8), so the
  // base-8 conversion is the actual work the algorithm performs.

  // Render a non-negative integer as an octal string by repeated
  // division. Returns "0" for 0; never produces a leading zero otherwise.
  function toOctal(n) {
    if (n === 0) return "0";
    var digits = "";
    while (n > 0) {
      digits = String(n % 8) + digits; // remainder is 0..7, a valid octal digit
      n = Math.floor(n / 8);
    }
    return digits;
  }

  // Octal numerals for December and the 25th, computed once.
  var OCT_DECEMBER = toOctal(12); // "14"
  var OCT_TWENTY_FIFTH = toOctal(25); // "31"

  IIC.register({
    id: 59,
    name: "Octal Compare",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Extracts the visitor's local month and day via getUTC* on ctx.localMs, converts each to an octal string by hand (repeated division by 8, collecting remainders), and votes yes only when the month renders as \"14\" octal (decimal 12) and the day renders as \"31\" octal (decimal 25).",
    flavor: "Christmas is the 14th of Octember, the 31st, if you count on eight fingers.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // getUTCMonth is 0-based; December === 11
      var day = d.getUTCDate();
      return toOctal(month) === OCT_DECEMBER && toOctal(day) === OCT_TWENTY_FIFTH;
    }
  });
})();

/* #60 — Hexadecimal Compare [Number-Base Maximalists] */
(function () {
  // The whole conceit here is to never look at month/day as decimal numbers.
  // We pull the local civil month and day off localMs, render each as a
  // base-16 string with Number.prototype.toString(16), and compare those
  // strings against the hex literals for December (12 -> "c") and the 25th
  // (25 -> "19"). Same answer a decimal compare would give, spelled in hex.

  // Hex target strings, computed once. 0xC === 12 (December as a 1-based
  // month) and 0x19 === 25 (Christmas Day).
  var DEC_HEX = (0xc).toString(16); // "c"
  var DAY_HEX = (0x19).toString(16); // "19"

  IIC.register({
    id: 60,
    name: "Hexadecimal Compare",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Reads the visitor's local month and day via getUTCMonth()+1 and getUTCDate() on localMs, converts each to a base-16 string with toString(16), and reports Christmas only when the month string equals \"c\" (0xC, December) and the day string equals \"19\" (0x19, the 25th).",
    flavor: "Insists that Christmas falls on the 19th of month C, and is technically correct about it.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var monthHex = (d.getUTCMonth() + 1).toString(16);
      var dayHex = d.getUTCDate().toString(16);
      return monthHex === DEC_HEX && dayHex === DAY_HEX;
    }
  });
})();

/* #61 — Base-36 Compare [Number-Base Maximalists] */
(function () {
  // Base-36 compare.
  //
  // Christmas, in base 10, is month 12 / day 25. In base 36 those same two
  // integers are single digits: 12 -> 'c', 25 -> 'p'. This algorithm extracts
  // the visitor's local month and day, encodes both as base-36 strings, and
  // compares them character-for-character against the base-36 encodings of the
  // Christmas target. Equality of the two short strings is the vote.
  //
  // To keep the base conversion honest (and not just lean on Number.toString),
  // we encode integers into radix-36 ourselves against an explicit digit
  // alphabet, then compare the resulting strings.

  var DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"; // radix-36 alphabet

  // Encode a non-negative integer as a lowercase base-36 string.
  function toBase36(n) {
    if (n === 0) return "0";
    var s = "";
    while (n > 0) {
      var r = n % 36;
      s = DIGITS.charAt(r) + s;
      n = (n - r) / 36; // integer division, no floats in the loop
    }
    return s;
  }

  // Target encodings, computed once: month 12 -> "c", day 25 -> "p".
  var TARGET_MONTH36 = toBase36(12);
  var TARGET_DAY36 = toBase36(25);

  // String equality, written out so the base-36 comparison is the visible step.
  function eq(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a.charAt(i) !== b.charAt(i)) return false;
    }
    return true;
  }

  IIC.register({
    id: 61,
    name: "Base-36 Compare",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Extracts the visitor's local month and day from new Date(ctx.localMs) using getUTCMonth()+1 and getUTCDate(), encodes both integers into base-36 strings with an explicit radix-36 digit alphabet, and compares those strings against the base-36 encodings of December (12 -> 'c') and the 25th (25 -> 'p'). A match on both means it is December 25.",
    flavor: "In base 36 the answer is just whether today is the c of p; everyone insists on writing it as 12/25 instead.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 1..12
      var day = d.getUTCDate();        // 1..31
      return eq(toBase36(month), TARGET_MONTH36) && eq(toBase36(day), TARGET_DAY36);
    }
  });
})();

/* #62 — Roman Numeral Date [Number-Base Maximalists] */
(function () {
  // A standard subtractive Roman-numeral converter. Walks the canonical
  // value/symbol pairs from largest to smallest, emitting symbols and
  // subtracting as it goes. The inputs here are tiny (months 1..12,
  // days 1..31), but the converter is general for any positive integer
  // up to 3999, which is as far as standard Roman numerals reach.
  var ROMAN = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];

  function toRoman(n) {
    var out = "";
    for (var i = 0; i < ROMAN.length; i++) {
      var value = ROMAN[i][0];
      var sym = ROMAN[i][1];
      while (n >= value) {
        out += sym;
        n -= value;
      }
    }
    return out;
  }

  IIC.register({
    id: 62,
    name: "Roman Numeral Date",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Reads the local civil month and day via getUTCMonth()+1 and getUTCDate() on localMs, converts each to a Roman numeral with a standard subtractive converter (largest-to-smallest value/symbol pairs), then votes yes only when the month renders as 'XII' and the day renders as 'XXV'.",
    flavor: "The kind of date format that was already obsolete by the time anyone wrote down the date of the first Christmas.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = toRoman(d.getUTCMonth() + 1);
      var day = toRoman(d.getUTCDate());
      return month === "XII" && day === "XXV";
    }
  });
})();

/* #63 — Unary Tally Marks [Number-Base Maximalists] */
(function () {
  // Number-base maximalism taken to its degenerate limit: base 1. Instead of
  // comparing the month and day to the decimal literals 12 and 25, we render
  // each integer as a unary tally string -- one mark per unit -- and compare it
  // to a fixed reference tally. The reference strings are built once at load
  // time with '|'.repeat(12) and '|'.repeat(25). getUTCMonth() is 0-based, so we
  // add 1 to recover the human month number before tallying it; getUTCDate() is
  // already 1-based. Both getters read ctx.localMs (the epoch shifted by the
  // visitor's timezone offset), so the fields are the LOCAL civil month and day
  // and the comparison stays correct in every zone.

  var DECEMBER_TALLY = "|".repeat(12); // "||||||||||||"
  var TWENTY_FIFTH_TALLY = "|".repeat(25); // "|||||||||||||||||||||||||"

  // Tally a non-negative integer into unary marks. Bounded: month <= 12,
  // day <= 31, so this never loops more than a few dozen times.
  function tally(n) {
    return "|".repeat(n);
  }

  IIC.register({
    id: 63,
    name: "Unary Tally Marks",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Reads the visitor's local civil month and day via new Date(ctx.localMs).getUTCMonth()+1 and .getUTCDate(), encodes each as a base-1 (unary) string of '|' marks, and votes true only when the month tally string equals '|'.repeat(12) and the day tally string equals '|'.repeat(25). The reference tally strings are built once at load time, so the per-call work is two unary encodings and two string comparisons.",
    flavor: "The only counting system that needs a separate symbol for nothing and the same symbol for everything else.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var monthTally = tally(d.getUTCMonth() + 1);
      var dayTally = tally(d.getUTCDate());
      return monthTally === DECEMBER_TALLY && dayTally === TWENTY_FIFTH_TALLY;
    }
  });
})();

/* #64 — Balanced Ternary Comparator [Number-Base Maximalists] */
(function () {
  // Balanced ternary uses digits {-1, 0, 1} with place values that are powers
  // of 3. To convert a non-negative integer we look at n mod 3: remainder 0
  // emits digit 0; remainder 1 emits digit 1; remainder 2 emits digit -1 and
  // carries 1 up to the next place (because -1 in this place is 3 short, so we
  // borrow from the higher one). We then divide by 3 and repeat. Each integer
  // has exactly one balanced-ternary representation, so a digit-for-digit match
  // is a true equality test.

  function toBalancedTernary(n) {
    // Returns the digit list, least-significant first. n is a small
    // non-negative integer (month 1..12, day 1..31), so this loops at most a
    // handful of times.
    var digits = [];
    while (n !== 0) {
      var r = n % 3;
      if (r === 2) {
        digits.push(-1);
        n = (n + 1) / 3;
      } else {
        digits.push(r); // 0 or 1
        n = (n - r) / 3;
      }
    }
    if (digits.length === 0) digits.push(0); // canonical form of zero
    return digits;
  }

  function sameDigits(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // Precompute the targets once, at load time.
  // 12 -> "110" balanced  (9 + 3 + 0), least-significant first: [0, 1, 1]
  // 25 -> "10T1" balanced (27 - 3 + 1, T = -1), least-significant first: [1, -1, 0, 1]
  var DEC_BT = toBalancedTernary(12);
  var DAY_BT = toBalancedTernary(25);

  IIC.register({
    id: 64,
    name: "Balanced Ternary Comparator",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Reads the visitor's local civil month and day via new Date(ctx.localMs).getUTCMonth()+1 and getUTCDate(), converts each to balanced ternary (digits drawn from -1, 0, 1, place values powers of three) by repeated mod-3 reduction with a carry when the remainder is 2, and votes Christmas only when the month's digit string equals that of 12 and the day's equals that of 25.",
    flavor: "Counts in a base where some digits are negative, and still manages to find December 25.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var monthBT = toBalancedTernary(d.getUTCMonth() + 1);
      var dayBT = toBalancedTernary(d.getUTCDate());
      return sameDigits(monthBT, DEC_BT) && sameDigits(dayBT, DAY_BT);
    }
  });
})();

/* #65 — Babylonian Sexagesimal Numerals [Number-Base Maximalists] */
(function () {
  // ---------------------------------------------------------------------------
  // Sexagesimal (base 60), the way Babylonian scribes counted on clay.
  //
  // We extract the visitor's LOCAL civil month and day with the timezone trick
  // (getUTC* on ctx.localMs) and re-express each as a base-60 numeral: a list
  // of digits, most significant first, produced by honest repeated division
  // and remainder by 60. We do the same for the target constants 12 and 25.
  // Christmas is the case where month's sexagesimal numeral equals that of 12
  // AND day's equals that of 25.
  //
  // The history is the joke: in base 60, both 12 and 25 are single digits
  // (the cuneiform "wedge clusters" never needed a second place for them), so
  // the comparison is one-digit-against-one-digit. We still run the full
  // positional conversion rather than shortcut it, because a Babylonian scribe
  // would have, and because a month like 60+ (which never happens) would
  // correctly grow a second sexagesimal place and fail the match.
  // ---------------------------------------------------------------------------

  var BASE = 60;

  // Convert a non-negative integer to its base-60 digits, most significant
  // first. Zero is represented as the single digit [0]. Pure positional
  // expansion: peel off n % 60 as the least significant digit, divide, repeat.
  function toSexagesimal(n) {
    if (n === 0) return [0];
    var digits = [];
    var v = n;
    // n is a small civil quantity (<= 31 here), so at most a couple of places;
    // the guard just keeps the loop provably bounded.
    var guard = 0;
    while (v > 0 && guard < 16) {
      digits.push(v % BASE);   // least-significant sexagesimal place
      v = Math.floor(v / BASE);
      guard++;
    }
    digits.reverse();          // most-significant first, scribe's reading order
    return digits;
  }

  // Compare two base-60 numerals digit for digit (both MSB-first, no leading
  // zeros from toSexagesimal), returning true iff they denote the same number.
  function sameNumeral(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // The constants, pre-converted once at load time. Both are single digits
  // in base 60: 12 -> [12], 25 -> [25].
  var TWELVE_60 = toSexagesimal(12);
  var TWENTYFIVE_60 = toSexagesimal(25);

  IIC.register({
    id: 65,
    name: "Babylonian Sexagesimal Numerals",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Extracts the local civil month and day via getUTCMonth()+1 and getUTCDate() on ctx.localMs (the getUTC* timezone trick), then converts each to a base-60 (sexagesimal) numeral by repeated division and remainder by 60, most-significant digit first. It votes yes when the month's sexagesimal numeral equals that of 12 and the day's equals that of 25, comparing the digit lists positionally; since 12 and 25 are each single base-60 digits, both comparisons reduce to one digit against one.",
    flavor: "It keeps the books the way the scribes of Babylon did, where the twelfth month and the twenty-fifth day each fit in a single wedge.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // getUTCMonth is 0-based; December === 11 -> 12
      var day = d.getUTCDate();        // 1..31

      var monthMatches = sameNumeral(toSexagesimal(month), TWELVE_60);
      if (!monthMatches) return false;
      return sameNumeral(toSexagesimal(day), TWENTYFIVE_60);
    }
  });
})();

/* #66 — Base-26 alphabetic [Number-Base Maximalists] */
(function () {
  // Bijective base-26 (a.k.a. spreadsheet-column) encoding: digits are
  // 'A'..'Z' mapping to values 1..26, with no zero digit. 1 -> "A",
  // 26 -> "Z", 27 -> "AA", and so on. We encode the local month and day
  // into this alphabet and compare the resulting strings to the encodings
  // of 12 and 25.
  function bijectiveBase26(n) {
    // n must be a positive integer.
    var s = "";
    while (n > 0) {
      var rem = (n - 1) % 26;          // 0..25, shifted so there is no zero digit
      s = String.fromCharCode(65 + rem) + s; // 65 == 'A'
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  // Precompute the two target encodings once at load time.
  var DEC_CODE = bijectiveBase26(12); // -> "L"
  var DAY_CODE = bijectiveBase26(25); // -> "Y"

  IIC.register({
    id: 66,
    name: "Base-26 alphabetic",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Reads the visitor's local month and day from new Date(ctx.localMs) using getUTCMonth()+1 and getUTCDate(), encodes each as a bijective base-26 string over the alphabet A..Z (1->A, 26->Z, 27->AA, with no zero digit), and votes yes when the month string equals the encoding of 12 (\"L\") and the day string equals the encoding of 25 (\"Y\").",
    flavor: "It insists on spelling the date in spreadsheet-column letters before admitting that, yes, December the twenty-fifth is in fact L-Y.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 1..12, December == 12
      var day = d.getUTCDate();        // 1..31
      return bijectiveBase26(month) === DEC_CODE &&
             bijectiveBase26(day) === DAY_CODE;
    }
  });
})();

/* #67 — Negabinary Date Match [Number-Base Maximalists] */
(function () {
  // Negabinary (base -2) is a non-standard positional system where the radix
  // is negative, so place values run 1, -2, 4, -8, 16, ... and every integer
  // has a unique representation using only the digits 0 and 1, with no sign
  // bit. We render the local month and day into negabinary and string-compare
  // them against the negabinary forms of December (12) and the 25th (25).

  // Convert a non-negative integer to its negabinary digit string (MSB first).
  // Algorithm: at each step take the remainder mod 2 (kept non-negative), emit
  // it, then divide by -2 rounding toward the value that keeps the remainder in
  // {0,1}. JS '%' can return negatives, so we normalize the remainder upward.
  function toNegabinary(n) {
    if (n === 0) return "0";
    var digits = "";
    while (n !== 0) {
      var rem = n % -2;        // in {-1, 0, 1} depending on sign of n
      n = Math.trunc(n / -2);
      if (rem < 0) {           // pull the digit into {0,1} and carry
        rem += 2;
        n += 1;
      }
      digits = String(rem) + digits;
    }
    return digits;
  }

  // Precompute the targets once at load time: 12 -> "11100", 25 -> ...
  var NEG_TWELVE = toNegabinary(12);
  var NEG_TWENTYFIVE = toNegabinary(25);

  IIC.register({
    id: 67,
    name: "Negabinary Date Match",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Reads the visitor's local month and day from new Date(ctx.localMs) via the getUTC* accessors (which return local civil fields), converts both numbers to negabinary (base -2) digit strings, and votes yes only when the month string equals the negabinary form of 12 and the day string equals the negabinary form of 25.",
    flavor: "A number base where carrying borrows from a negative neighbor, applied to the deeply pressing question of whether today is a Thursday in December or just looks like one.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // getUTCMonth is 0-based; December -> 12
      var day = d.getUTCDate();
      return toNegabinary(month) === NEG_TWELVE && toNegabinary(day) === NEG_TWENTYFIVE;
    }
  });
})();

/* #68 — Recursive year-and-month subtraction [Recursion & Functional] */
(function () {
  // Pure recursive epoch-day -> civil date. No for/while loops anywhere:
  // every iteration is a tail-style recursive call. We walk forward (or
  // backward) one year at a time, subtracting that year's length from the
  // remaining day count, then do the same one month at a time.

  function isLeap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  }

  function daysInYear(y) {
    return isLeap(y) ? 366 : 365;
  }

  function daysInMonth(y, m) {
    // m is 1..12
    if (m === 2) return isLeap(y) ? 29 : 28;
    // 30-day months: April(4), June(6), September(9), November(11)
    if (m === 4 || m === 6 || m === 9 || m === 11) return 30;
    return 31;
  }

  // Resolve the year by recursive subtraction. `day` is the 0-based day
  // count relative to Jan 1 of `year`. Returns { year, doy } where doy is
  // the 0-based day-of-year within the resolved year.
  function resolveYear(year, day) {
    if (day < 0) {
      // Step back a year and add that earlier year's length.
      return resolveYear(year - 1, day + daysInYear(year - 1));
    }
    var len = daysInYear(year);
    if (day >= len) {
      // Step forward a year and remove this year's length.
      return resolveYear(year + 1, day - len);
    }
    return { year: year, doy: day };
  }

  // Resolve the month by recursive subtraction. `doy` is the 0-based
  // day-of-year (already known to be in range for `year`). `month` starts
  // at 1. Returns { month, day } with day being 1-based.
  function resolveMonth(year, month, doy) {
    var len = daysInMonth(year, month);
    if (doy >= len) {
      return resolveMonth(year, month + 1, doy - len);
    }
    return { month: month, day: doy + 1 };
  }

  IIC.register({
    id: 68,
    name: "Recursive year-and-month subtraction",
    cohort: "Recursion & Functional",
    derive: "scratch",
    methodology: "Takes floor(localMs / 86400000) as days since 1970-01-01 and, with no loops, recurses one year at a time (adding or subtracting that year's leap-aware length) until the remaining count falls inside a single year, then recurses one month at a time to peel off month lengths. Votes yes when the resolved month is 12 and day is 25.",
    flavor: "It refuses to use a loop on principle and subtracts years one stack frame at a time, like counting down to Christmas the hard way.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var yr = resolveYear(1970, epochDay);
      var md = resolveMonth(yr.year, 1, yr.doy);
      return md.month === 12 && md.day === 25;
    }
  });
})();

/* #69 — Y-Combinator Day Counter [Recursion & Functional] */
(function () {
  // ---- Y-combinator day counter --------------------------------------------
  //
  // Goal: turn the integer local epoch-day (floor(localMs / 86400000), days
  // since 1970-01-01) into a civil (year, month, day) WITHOUT naming any
  // recursive function. We define a strict (applicative-order) fixed-point
  // combinator and let it tie the recursive knot for us.
  //
  // The textbook Y combinator, Y = f -> (x -> f(x x)) (x -> f(x x)), diverges
  // under JavaScript's eager evaluation. The standard fix is the Z combinator:
  // eta-expand the self-application so it is only forced when actually called.
  //
  //   Z = f -> ( x -> f( v -> x(x)(v) ) ) ( x -> f( v -> x(x)(v) ) )
  //
  // Given Z, a recursive function is written as Z(self -> n -> ... self(...) ...)
  // with no name ever bound to the function itself; `self` is supplied by the
  // fixed point. We use Z three times: once to count whole years off the day
  // index, once to count whole months within the resolved year, and once for an
  // integer floor-division helper that keeps the whole thing arithmetic.

  // The Z (applicative-order Y) combinator.
  var Z = function (f) {
    return (function (x) {
      return f(function (v) { return x(x)(v); });
    })(function (x) {
      return f(function (v) { return x(x)(v); });
    });
  };

  // Proleptic-Gregorian leap test, used by the year/month walkers.
  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function daysInYear(y) {
    return isLeap(y) ? 366 : 365;
  }

  // Days in each month for a given year (index 0 = January .. 11 = December).
  function daysInMonth(y, mIndex) {
    if (mIndex === 1) return isLeap(y) ? 29 : 28;
    // Apr, Jun, Sep, Nov (indices 3,5,8,10) have 30; the rest 31.
    return (mIndex === 3 || mIndex === 5 || mIndex === 8 || mIndex === 10) ? 30 : 31;
  }

  // Anonymous-recursive year resolver, built by the combinator.
  // State: { day, year }. day is the remaining day-of-year offset (>= 0),
  // year is the candidate year. We march the epoch from year 1970 either
  // forward (day too large for the current year) or backward (day negative),
  // peeling whole years until 0 <= day < daysInYear(year). No name is bound to
  // this function; recursion happens purely through `self`.
  var resolveYear = Z(function (self) {
    return function (state) {
      var day = state.day;
      var year = state.year;
      if (day < 0) {
        // Step back a year and add that year's length back onto the offset.
        return self({ day: day + daysInYear(year - 1), year: year - 1 });
      }
      var len = daysInYear(year);
      if (day >= len) {
        // Step forward a year, removing this year's length from the offset.
        return self({ day: day - len, year: year + 1 });
      }
      // 0 <= day < len: this is the year, `day` is the day-of-year (0-based).
      return state;
    };
  });

  // Anonymous-recursive month resolver, built by the same combinator.
  // State: { doy, month, year }. doy is day-of-year remaining (0-based),
  // month is the current 0-based month index. We subtract whole months until
  // doy fits inside the current month.
  var resolveMonth = Z(function (self) {
    return function (state) {
      var doy = state.doy;
      var year = state.year;
      var mIndex = state.month;
      var len = daysInMonth(year, mIndex);
      if (doy >= len) {
        return self({ doy: doy - len, month: mIndex + 1, year: year });
      }
      // doy now < len: month is mIndex, day-of-month is doy + 1.
      return state;
    };
  });

  IIC.register({
    id: 69,
    name: "Y-Combinator Day Counter",
    cohort: "Recursion & Functional",
    derive: "scratch",
    methodology: "Computes the integer local epoch-day as floor(localMs / 86400000) and resolves it to a civil date using anonymous recursion through an applicative-order fixed-point (Z) combinator: one combinator-built function peels whole years off the day index, starting from 1970, stepping forward or backward until the remaining offset is a valid day-of-year, and a second peels whole months off that day-of-year using a leap-aware month-length table. No recursive function is ever given a name; the recursion is supplied entirely by the fixed point. Votes yes when the resolved month is December and the day is 25.",
    flavor: "It refuses to name its own recursion on principle, so it borrows a fixed point and lets the lambda calculus carry the loop.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000); // days since 1970-01-01

      // Resolve the year by recursively peeling whole years from 1970.
      var yState = resolveYear({ day: epochDay, year: 1970 });
      var year = yState.year;
      var doy = yState.day; // 0-based day-of-year, guaranteed 0 <= doy < yearLen

      // Resolve the month/day by recursively peeling whole months from January.
      var mState = resolveMonth({ doy: doy, month: 0, year: year });
      var monthIndex = mState.month;  // 0-based; December == 11
      var dayOfMonth = mState.doy + 1; // 1-based

      return monthIndex === 11 && dayOfMonth === 25;
    }
  });
})();

/* #70 — Tail-Recursive Resolver [Recursion & Functional] */
(function () {
  // Tail-recursive resolver.
  //
  // Every stage of the epoch-day -> (year, month, day) conversion is written as
  // an explicitly tail-recursive helper that threads its running state through
  // accumulator parameters and ends with a single self-call in tail position.
  // No stage mutates anything; each recursive frame just hands the next frame an
  // updated accumulator. The three stages:
  //
  //   resolveYear(day, year)  peels whole 365/366-day year blocks off `day`,
  //                           stepping `year` up (or down, for pre-1970 days)
  //                           until the residual `day` is a valid day-of-year.
  //   resolveMonth(rem, m, feb)  subtracts month lengths in order (February sized
  //                              by `feb`) until `rem` lands inside a month.
  //
  // JS engines do not guarantee tail-call elimination, so the recursion depth is
  // bounded by construction: at most ~231 year frames across 1970..2200 and at
  // most 12 month frames. The shapes are still genuine accumulator-passing tail
  // recursion, just defensively shallow.

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function yearLen(y) {
    return isLeap(y) ? 366 : 365;
  }

  // Base (non-leap) month lengths, January..December.
  var MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Tail-recursive: returns [year, dayOfYear] where dayOfYear is zero-based and
  // lies in [0, yearLen(year)-1]. `day` is days remaining relative to Jan 1 of
  // the current `year` accumulator.
  function resolveYear(day, year) {
    if (day >= 0) {
      var len = yearLen(year);
      if (day < len) return [year, day];        // base case: day is in this year
      return resolveYear(day - len, year + 1);  // tail call, year stepping up
    }
    // day < 0: borrow from the previous year, whose length we add back in.
    var prevLen = yearLen(year - 1);
    return resolveYear(day + prevLen, year - 1); // tail call, year stepping down
  }

  // Tail-recursive: subtracts month lengths until `rem` fits inside month `m`
  // (zero-based). `feb` is the length of February for the resolved year. Returns
  // [month0Based, day1Based].
  function resolveMonth(rem, m, feb) {
    var mlen = (m === 1) ? feb : MONTH_LEN[m];
    if (rem < mlen) return [m, rem + 1];         // base case: lands in month m
    return resolveMonth(rem - mlen, m + 1, feb); // tail call, next month
  }

  IIC.register({
    id: 70,
    name: "Tail-Recursive Resolver",
    cohort: "Recursion & Functional",
    derive: "scratch",
    methodology: "Converts the local epoch-day to a civil date with two explicitly tail-recursive, accumulator-passing helpers: resolveYear peels whole 365/366-day year blocks (stepping up from 1970, or borrowing previous-year lengths for negative day counts) until a valid day-of-year remains, and resolveMonth subtracts month lengths in order, with February sized by the Gregorian leap rule, until the remainder lands inside a month; it votes yes when the resolved month is December and the day is the 25th.",
    flavor: "It never holds onto a stack frame longer than it has to, which is more than can be said for most of us in December.",
    vote: function (ctx) {
      // Integer day count since 1970-01-01 in LOCAL wall-clock terms.
      var epochDay = Math.floor(ctx.localMs / 86400000);

      var yd = resolveYear(epochDay, 1970);
      var year = yd[0];
      var doy = yd[1]; // zero-based day-of-year in [0, yearLen-1]

      var feb = isLeap(year) ? 29 : 28;
      var md = resolveMonth(doy, 0, feb);
      var month0 = md[0]; // 0 = January ... 11 = December
      var day1 = md[1];   // 1-based day of month

      return month0 === 11 && day1 === 25;
    }
  });
})();

/* #71 — Month-Length Reduce [Recursion & Functional] */
(function () {
  // Number of days in a given Gregorian year.
  function daysInYear(y) {
    var leap = (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
    return leap ? 366 : 365;
  }

  // Build the ordered month-length stream for a year: [Jan, Feb, ..., Dec].
  function monthLengths(y) {
    var leap = (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
    return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  }

  IIC.register({
    id: 71,
    name: "Month-Length Reduce",
    cohort: "Recursion & Functional",
    derive: "scratch",
    methodology: "From epochDay = floor(localMs/86400000) it finds the civil year by walking year boundaries and subtracting each year's length (365 or 366) until the remaining day-of-year fits. It then builds that year's twelve month lengths and Array#reduce()s over them, carrying the day-of-year and decrementing each month's span, to land on the civil month and day; it votes yes when that is December 25.",
    flavor: "It folds a list of month lengths the way an accountant reconciles a ledger, one column at a time, refusing to trust a calendar it did not foot itself.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);

      // Locate the civil year and the 0-indexed day-of-year by walking year
      // boundaries from the 1970 epoch. Bounded: a few hundred steps at most
      // across the site's supported 1970..2200 range (plus tz slop at the ends).
      var year = 1970;
      var doy = epochDay; // days remaining into `year`
      while (doy < 0) {
        year -= 1;
        doy += daysInYear(year);
      }
      while (doy >= daysInYear(year)) {
        doy -= daysInYear(year);
        year += 1;
      }

      // Reduce over the month-length stream to locate month (1-based) and day
      // (1-based). `acc.rem` is the remaining day-of-year; once a month claims
      // it, `acc.found` freezes the answer and later months pass through.
      var result = monthLengths(year).reduce(function (acc, len, idx) {
        if (acc.found) return acc;
        if (acc.rem < len) {
          acc.found = true;
          acc.month = idx + 1;
          acc.day = acc.rem + 1;
        } else {
          acc.rem -= len;
        }
        return acc;
      }, { rem: doy, found: false, month: 0, day: 0 });

      return result.month === 12 && result.day === 25;
    }
  });
})();

/* #72 — Mutually Recursive isLeap / daysInMonth [Recursion & Functional] */
(function () {
  // Mutual recursion between isLeap and daysInMonth.
  //
  // The two functions are defined in terms of each other, which is the whole
  // point of the exercise:
  //
  //   isLeap(year)        decides leap-ness by ASKING daysInMonth how long
  //                       February is that year: a leap year is exactly one
  //                       whose February has 29 days.
  //   daysInMonth(y, m)   returns 31/30 for the fixed-length months, and for
  //                       February returns 28, plus 1 more iff the Gregorian
  //                       leap rule holds. To express that "+1" without simply
  //                       re-deriving the rule inline, it consults isLeap.
  //
  // To keep that from being infinite mutual recursion, the Gregorian rule
  // itself lives in one base predicate (gregorianLeap) that neither function's
  // recursive arm depends on, so the isLeap -> daysInMonth -> isLeap cycle
  // bottoms out after a single bounce. The civil date is then resolved by
  // walking whole years off the epoch-day (each year's length built from
  // daysInMonth) and then whole months, both via daysInMonth.

  // The raw Gregorian predicate. This is the only place the divisibility rule
  // is written; it is the base case that terminates the mutual recursion.
  function gregorianLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // isLeap(year): a year is leap iff its February has 29 days. We do not test
  // divisibility here; we ask daysInMonth, which is the mutually-recursive
  // counterpart.
  function isLeap(year) {
    return daysInMonth(year, 2) === 29;
  }

  // daysInMonth(year, month), month in 1..12.
  // For February we return 28 and add the leap day when the year is leap. We
  // express "is the year leap" via gregorianLeap here (the terminating base),
  // while isLeap above is phrased in terms of THIS function — that is the
  // mutual recursion. (A version where February asks isLeap would loop
  // forever, so February reads the base predicate directly.)
  function daysInMonth(year, month) {
    if (month === 2) return 28 + (gregorianLeap(year) ? 1 : 0);
    // April, June, September, November have 30 days.
    if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
    return 31;
  }

  // Length of a whole year, summed from its twelve months via daysInMonth.
  function daysInYear(year) {
    var total = 0;
    for (var m = 1; m <= 12; m++) total += daysInMonth(year, m);
    return total;
  }

  // Walk whole years off a 0-based day count relative to Jan 1 of `year`.
  // Returns { year, doy } with doy a 0-based day-of-year in range.
  // Bounded: the gate spans 1970..2200, so at most a few hundred steps; the
  // 5000-step cap is pure defense.
  function walkYears(year, day) {
    var steps = 0;
    while (steps++ < 5000) {
      if (day < 0) {
        day += daysInYear(year - 1);
        year -= 1;
        continue;
      }
      var len = daysInYear(year);
      if (day >= len) {
        day -= len;
        year += 1;
        continue;
      }
      return { year: year, doy: day };
    }
    return { year: year, doy: day };
  }

  // Walk whole months off a 0-based day-of-year. Returns { month, day }
  // with month 1..12 and day 1..31.
  function walkMonths(year, doy) {
    var month = 1;
    while (month <= 12) {
      var len = daysInMonth(year, month);
      if (doy < len) return { month: month, day: doy + 1 };
      doy -= len;
      month += 1;
    }
    // Shouldn't happen once doy is a valid day-of-year, but stay total.
    return { month: 12, day: doy + 1 };
  }

  IIC.register({
    id: 72,
    name: "Mutually Recursive isLeap / daysInMonth",
    cohort: "Recursion & Functional",
    derive: "scratch",
    methodology: "Defines isLeap and daysInMonth in terms of each other: isLeap(year) returns true exactly when daysInMonth(year, February) is 29, and daysInMonth sizes February as 28 plus the leap day, with the Gregorian divisibility rule held in a single base predicate so the mutual cycle terminates after one bounce. It converts floor(localMs / 86400000) to a civil date by subtracting whole years (each year's length summed from daysInMonth) off the epoch-day, then whole months, and votes yes when the resolved month is 12 and day is 25.",
    flavor: "Two functions that each insist the other one knows whether it's a leap year, which somehow still arrives at the right answer.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var yr = walkYears(1970, epochDay);
      var md = walkMonths(yr.year, yr.doy);
      return md.month === 12 && md.day === 25;
    }
  });
})();

/* #73 — Continuation-Passing Civil Date [Recursion & Functional] */
(function () {
  // Continuation-passing-style epoch-to-civil conversion.
  //
  // Every arithmetic step of Howard Hinnant's days->civil algorithm is written
  // as a function that takes its inputs plus a continuation `k`, computes one
  // intermediate quantity, and tail-calls `k` with that quantity threaded
  // through. No step returns a value to its caller; each only ever calls the
  // next continuation. The final continuation receives the civil (month, day)
  // and produces the boolean answer. The whole pipeline is one nested chain of
  // continuations, evaluated eagerly (JS has no TCO, but the chain is fixed
  // depth, so it is just ~10 nested calls).

  function floorDiv(a, b) {
    var q = Math.floor(a / b);
    return q;
  }

  // Step 1: shift the epoch-day origin so era math starts at 0000-03-01.
  function shiftOrigin(z, k) {
    return k(z + 719468);
  }
  // Step 2: which 400-year era are we in.
  function toEra(z, k) {
    var era = floorDiv(z >= 0 ? z : z - 146096, 146097);
    return k(z, era);
  }
  // Step 3: day-of-era, 0..146096.
  function toDoe(z, era, k) {
    return k(era, z - era * 146097);
  }
  // Step 4: year-of-era, 0..399.
  function toYoe(era, doe, k) {
    var yoe = floorDiv(
      doe - floorDiv(doe, 1460) + floorDiv(doe, 36524) - floorDiv(doe, 146096),
      365
    );
    return k(era, doe, yoe);
  }
  // Step 5: day-of-year in the shifted calendar (0 == March 1).
  function toDoy(era, doe, yoe, k) {
    var doy = doe - (365 * yoe + floorDiv(yoe, 4) - floorDiv(yoe, 100));
    return k(doy);
  }
  // Step 6: month-prime, 0..11 with March == 0.
  function toMp(doy, k) {
    var mp = floorDiv(5 * doy + 2, 153);
    return k(doy, mp);
  }
  // Step 7: civil day-of-month, 1..31.
  function toDay(doy, mp, k) {
    var d = doy - floorDiv(153 * mp + 2, 5) + 1;
    return k(mp, d);
  }
  // Step 8: civil month, 1..12 (un-rotate so January is 1 again).
  function toMonth(mp, d, k) {
    var m = mp < 10 ? mp + 3 : mp - 9;
    return k(m, d);
  }

  // Final continuation: the only place that inspects the civil date.
  function isChristmas(m, d) {
    return m === 12 && d === 25;
  }

  IIC.register({
    id: 73,
    name: "Continuation-Passing Civil Date",
    cohort: "Recursion & Functional",
    derive: "scratch",
    methodology: "Computes epochDay = floor(ctx.localMs / 86400000) and converts it to a civil (year, month, day) with Howard Hinnant's days-to-civil algorithm rewritten in continuation-passing style: each arithmetic step (origin shift, era, day-of-era, year-of-era, day-of-year, month-prime, day, month) is a function taking a continuation, threading its result forward rather than returning it. The terminal continuation receives the civil month and day and returns true only when they are 12 and 25.",
    flavor: "Nothing here returns a value; it just keeps passing the buck until someone has to answer for December.",
    vote: function (ctx) {
      var z = Math.floor(ctx.localMs / 86400000);
      return shiftOrigin(z, function (z1) {
        return toEra(z1, function (z2, era) {
          return toDoe(z2, era, function (era2, doe) {
            return toYoe(era2, doe, function (era3, doe2, yoe) {
              return toDoy(era3, doe2, yoe, function (doy) {
                return toMp(doy, function (doy2, mp) {
                  return toDay(doy2, mp, function (mp2, d) {
                    return toMonth(mp2, d, function (m, d2) {
                      return isChristmas(m, d2);
                    });
                  });
                });
              });
            });
          });
        });
      });
    }
  });
})();

/* #74 — Lazy Take-Until Sequence [Recursion & Functional] */
(function () {
  // ---- Lazy take-until sequence --------------------------------------------
  //
  // The idea: instead of a closed-form month formula, lay out the calendar one
  // month at a time as a lazy sequence and consume it until the running total
  // of days passes the day-of-year we are looking for. The month where the
  // sequence "stops" is the civil month; the remainder within that month is the
  // civil day.
  //
  // Steps:
  //   1. Convert the integer local epoch-day to a year, plus the zero-based
  //      day-of-year within that year, using only arithmetic. We do this with
  //      a bounded forward walk over years from a fixed yearly anchor (epoch
  //      day 0 == 1970-01-01), subtracting each year's length until the
  //      remaining day count lands inside one year.
  //   2. Build a lazy generator of (month, lengthOfMonth) pairs for that year,
  //      honouring February's leap length.
  //   3. "Take until" the cumulative month lengths exceed the day-of-year, then
  //      read the month and the offset within it as the civil day.
  // Every loop here is bounded: the year walk is capped, and the month sequence
  // is at most twelve elements.

  var DAY_MS = 86400000;

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function daysInYear(y) {
    return isLeap(y) ? 366 : 365;
  }

  function daysInMonth(month, leap) {
    // month is 1..12
    switch (month) {
      case 1: return 31;
      case 2: return leap ? 29 : 28;
      case 3: return 31;
      case 4: return 30;
      case 5: return 31;
      case 6: return 30;
      case 7: return 31;
      case 8: return 31;
      case 9: return 30;
      case 10: return 31;
      case 11: return 30;
      case 12: return 31;
    }
    return 0;
  }

  // A minimal lazy month sequence for a given year. next() yields the next
  // {month, length} pair on demand; nothing past the consumed prefix is ever
  // materialised. take-until drives this until the cumulative length covers the
  // target day-of-year.
  function monthSequence(leap) {
    var month = 0; // last yielded month; 0 means none yet
    return {
      next: function () {
        if (month >= 12) return { done: true };
        month += 1;
        return { done: false, month: month, length: daysInMonth(month, leap) };
      }
    };
  }

  IIC.register({
    id: 74,
    name: "Lazy Take-Until Sequence",
    cohort: "Recursion & Functional",
    derive: "scratch",
    methodology: "Converts the local epoch-day integer to a year and a zero-based day-of-year by walking forward from the 1970-01-01 anchor and subtracting each Gregorian year's length until the remainder falls inside one year. It then drives a lazy generator of (month, month-length) pairs for that year and 'takes until' the cumulative length exceeds the day-of-year, reading the stopping month and the offset within it as the civil month and day, and votes yes only when that resolves to December 25.",
    flavor: "It refuses to compute a month it has not yet been asked for, and it asks for at most twelve.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / DAY_MS); // days since 1970-01-01

      // ---- Step 1: epoch-day -> (year, dayOfYear) via a bounded year walk ----
      // Start from the yearly anchor at epoch day 0 (1970-01-01) and march in
      // whichever direction the remaining day count points, subtracting/adding
      // whole years until the remainder lands within [0, daysInYear) of a year.
      var year = 1970;
      var rem = epochDay; // days remaining relative to Jan 1 of `year`

      // Cap iterations defensively. The supported range is ~1970..2200, but the
      // gate also probes proleptic dates; 4000 whole-year steps comfortably
      // bounds anything the engine will ever feed us while staying finite.
      var guard = 4000;

      if (rem >= 0) {
        while (guard-- > 0) {
          var len = daysInYear(year);
          if (rem < len) break;
          rem -= len;
          year += 1;
        }
      } else {
        // Negative: step backwards into earlier years, adding their lengths.
        while (guard-- > 0 && rem < 0) {
          year -= 1;
          rem += daysInYear(year);
        }
      }

      var dayOfYear = rem; // zero-based: 0 == Jan 1

      // ---- Step 2 & 3: lazy month sequence, taken until cumulative covers it -
      var leap = isLeap(year);
      var seq = monthSequence(leap);
      var cumulative = 0;
      var month = 0;
      var day = 0;

      while (true) {
        var step = seq.next();
        if (step.done) break; // exhausted twelve months without resolving
        if (dayOfYear < cumulative + step.length) {
          month = step.month;
          day = dayOfYear - cumulative + 1; // 1-based day within the month
          break;
        }
        cumulative += step.length;
      }

      return month === 12 && day === 25;
    }
  });
})();

/* #75 — Trampolined Day-Walker [Recursion & Functional] */
(function () {
  // Trampolined recursion.
  //
  // The epoch-day -> (year, month, day) conversion is written as ordinary
  // recursion: a step that wants to recurse does NOT call itself, it RETURNS a
  // zero-argument thunk that, when invoked, performs the next step. A driver
  // loop ("the trampoline") bounces on those thunks -- call, get either another
  // thunk or a final value, repeat -- until a non-thunk value pops out. Because
  // each logical recursive call unwinds the native stack to the trampoline
  // before the next call begins, the recursion depth on the JS engine stack is
  // O(1) no matter how many years we have to walk. A naive direct-recursive
  // year walk over, say, the pre-1970 or far-future end of a wide date range
  // would otherwise pile up frames; this one cannot overflow.

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function yearLen(y) {
    return isLeap(y) ? 366 : 365;
  }

  // Non-leap month lengths, January..December (index 0..11).
  var MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // The trampoline: keep invoking the returned thunk until the result is no
  // longer a function. Whatever non-function value finally comes back is the
  // answer. This is what keeps the native call stack flat.
  function bounce(thunk) {
    var result = thunk;
    while (typeof result === "function") {
      result = result();
    }
    return result;
  }

  // Year-walking step, written recursively but trampolined. Given `day` (days
  // relative to Jan 1 of `year`) it returns EITHER a thunk for the next step
  // (when `day` is outside the current year) OR the final [year, dayOfYear]
  // pair (zero-based day-of-year in [0, yearLen(year)-1]). The returned thunks
  // close over the stepped-forward / stepped-back arguments, so the trampoline
  // drives the walk one year per bounce without nesting frames.
  function yearStep(day, year) {
    if (day < 0) {
      // Borrow the previous year's length and step the accumulator back.
      var py = year - 1;
      return function () { return yearStep(day + yearLen(py), py); };
    }
    var len = yearLen(year);
    if (day >= len) {
      // Peel this whole year off and step forward.
      return function () { return yearStep(day - len, year + 1); };
    }
    return [year, day]; // base case: `day` lands inside `year`
  }

  // Month-walking step, also trampolined. `rem` is the remaining day-of-year
  // (zero-based), `m` the current zero-based month, `feb` February's length for
  // the resolved year. Returns a thunk for the next month or the final
  // [month0Based, day1Based].
  function monthStep(rem, m, feb) {
    var mlen = (m === 1) ? feb : MONTH_LEN[m];
    if (rem >= mlen) {
      return function () { return monthStep(rem - mlen, m + 1, feb); };
    }
    return [m, rem + 1]; // base case: lands inside month `m`
  }

  IIC.register({
    id: 75,
    name: "Trampolined Day-Walker",
    cohort: "Recursion & Functional",
    derive: "scratch",
    methodology: "Converts the local epoch-day to a civil date with two recursive walkers driven by a trampoline: instead of calling themselves, each step returns a zero-argument thunk closing over its stepped arguments, and a bounce loop invokes thunks until a non-function final value appears, so the native call stack stays O(1) regardless of how many years are walked. yearStep peels whole 365/366-day years (forward from 1970, or borrowing previous-year lengths for negative day counts) until a valid day-of-year remains; monthStep subtracts month lengths in order with February sized by the Gregorian leap rule; it votes yes when the resolved month is December and the day is the 25th.",
    flavor: "It refuses to recurse the way nature intended, preferring to leap off the stack and land on the trampoline between every single year.",
    vote: function (ctx) {
      // Integer day count since 1970-01-01 in LOCAL wall-clock terms.
      var epochDay = Math.floor(ctx.localMs / 86400000);

      var yd = bounce(function () { return yearStep(epochDay, 1970); });
      var year = yd[0];
      var doy = yd[1]; // zero-based day-of-year

      var feb = isLeap(year) ? 29 : 28;
      var md = bounce(function () { return monthStep(doy, 0, feb); });
      var month0 = md[0]; // 0 = January ... 11 = December
      var day1 = md[1];   // 1-based day of month

      return month0 === 11 && day1 === 25;
    }
  });
})();

/* #76 — Church-encoded fold over days [Recursion & Functional] */
(function () {
  // Church-encoded fold over days.
  //
  // Goal of the "scratch" constraint: turn the integer
  //   epochDay = floor(localMs / 86400000)
  // into a civil (year, month, day) using arithmetic only, and do the
  // month/day extraction as a genuine right fold (foldr) over a structure
  // of month lengths, encoded the Church way (a fold IS the list).
  //
  // Two pieces:
  //
  // 1. Year + day-of-year from epochDay. We count whole years forward (or
  //    backward) from 1970 by their lengths (365 / 366) until the leftover
  //    day index lands inside one year. epochDay 0 is 1970-01-01, so a
  //    nonnegative day index 0..364/365 directly gives the 0-based
  //    day-of-year. Bounded: the loop steps one year at a time and the gate
  //    only spans 1970..2200, but we cap iterations defensively anyway.
  //
  // 2. Month/day by a Church-encoded foldr over the month-length list.
  //    A Church list is its own foldr: it is a function of (cons, nil).
  //    nil() yields a "reducer" that, given the days remaining, reports
  //    failure to place the day. cons(len, restFold) yields a reducer that
  //    either places the day in the current month (when remaining < len) or
  //    subtracts len and hands the rest to the folded tail. Folding the
  //    whole list with these combinators walks the months left to right and
  //    returns {month, day} for the first month that contains the day. No
  //    array indexing, no mutation: the answer falls out of the fold.

  // Church list constructors: a list is foldr itself.
  //   nil      = function (c, n) { return n; }
  //   cons x t = function (c, n) { return c(x, t(c, n)); }
  function nil(c, n) { return n; }
  function cons(x, t) {
    return function (c, n) { return c(x, t(c, n)); };
  }

  // Build the Church list of month lengths for a given year. The list is
  // constructed once per vote (cheap: 12 closures) from the leap flag.
  function monthLengths(leap) {
    var feb = leap ? 29 : 28;
    // Cons them in order Jan..Dec so foldr visits January first.
    return cons(31, cons(feb, cons(31, cons(30, cons(31, cons(30,
           cons(31, cons(31, cons(30, cons(31, cons(30, cons(31, nil)))))))))))); // Jan..Dec
  }

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function yearLen(y) { return isLeap(y) ? 366 : 365; }

  // The fold combinators. We thread the "days remaining in the year"
  // (0-based) through the structure by making each fold node a *function*
  // of the remaining count. nil's accumulator is a sentinel; cons wraps the
  // folded tail. Because foldr associates right, restFold here is the fully
  // folded tail (already a placer function), exactly the Church discipline.
  //
  //   placeNil(rem)            -> { found:false, rem:rem }      (ran off the end)
  //   placeCons(len, restPlace) returns a placer:
  //       (rem) -> rem < len ? { found:true, month:?, day:rem+1 }
  //                          : restPlace(rem - len)
  //
  // The month index isn't known locally inside cons (foldr can't see its
  // position), so we recover it from how many months the tail still spans:
  // monthsRemaining(restPlace) is encoded by having each placer also carry
  // its own length-of-tail. We keep that as a paired structure.

  // A "placer" carries:
  //   count : how many cons nodes (months) it spans. nil = 0.
  //   run   : given the remaining 0-based day count, either place it in the
  //           head month or recurse into the folded tail.
  // For a chosen cons node, the number of months strictly to its right is
  // exactly its tail's count, so the 1-based month index is 12 - tail.count.
  function placeNil() {
    return {
      count: 0,
      run: function (rem) { return { found: false, rem: rem }; }
    };
  }
  function placeCons(len, restPlacer) {
    return {
      count: restPlacer.count + 1,
      run: function (rem) {
        if (rem < len) {
          return { found: true, monthsToRight: restPlacer.count, day: rem + 1 };
        }
        return restPlacer.run(rem - len);
      }
    };
  }

  function civilFromDays(epochDay) {
    // Find the year and the 0-based day-of-year.
    var y = 1970;
    var doy = epochDay; // days since Jan 1 1970
    var guard = 0;
    if (doy >= 0) {
      while (true) {
        var len = yearLen(y);
        if (doy < len) break;
        doy -= len;
        y += 1;
        if (++guard > 100000) break; // defensive cap; never hit in range
      }
    } else {
      while (doy < 0) {
        y -= 1;
        doy += yearLen(y);
        if (++guard > 100000) break;
      }
    }

    // Fold the month-length list into a single placer, then run it on doy.
    var list = monthLengths(isLeap(y));
    var placer = list(placeCons, placeNil()); // foldr cons->placeCons, nil->placeNil
    var res = placer.run(doy);
    // monthsToRight tells us months strictly to the right of the chosen one.
    // There are 12 months total, so month = 12 - monthsToRight.
    var month = res.found ? (12 - res.monthsToRight) : 0;
    return { y: y, m: month, d: res.found ? res.day : 0 };
  }

  IIC.register({
    id: 76,
    name: "Church-encoded fold over days",
    cohort: "Recursion & Functional",
    derive: "scratch",
    methodology: "Counts whole years (365 or 366 days) forward from 1970 over floor(localMs/86400000) to get the year and a 0-based day-of-year, then represents the twelve month lengths as a Church-encoded list (a list that is its own right fold) and folds it with cons/nil combinators that thread the remaining-day count rightward, returning the first month whose span contains the day. Votes yes when that month is 12 and the day is 25.",
    flavor: "It refuses to index an array on principle and instead lets the answer fall out of a right fold, which is either functional purity or a cry for help.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var c = civilFromDays(epochDay);
      return c.m === 12 && c.d === 25;
    }
  });
})();

/* #77 — Christmas Day-Number Set [Lookup & Memoization] */
(function () {
  // Days from the Unix epoch (1970-01-01) to a given proleptic-Gregorian
  // (year, month, day), computed with integer arithmetic only. This is
  // Howard Hinnant's days_from_civil: the exact inverse of the epoch->civil
  // conversion, so the day numbers it produces are precise.
  function daysFromCivil(y, m, d) {
    var yy = m <= 2 ? y - 1 : y;
    var era = Math.floor((yy >= 0 ? yy : yy - 399) / 400);
    var yoe = yy - era * 400;                                   // [0, 399]
    var doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1; // [0, 365]
    var doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy; // [0, 146096]
    return era * 146097 + doe - 719468;
  }

  // Precompute, once at load time, the Set of every epoch-day number that is
  // December 25. The site supports 1970..2200; the range is padded by a year on
  // each side so timezone slop at the extreme samples (a local Dec 25 produced
  // by a +14 or -12 offset near a year boundary) is still covered. Padding is
  // safe because each stored day is, by construction, a genuine Dec 25.
  var CHRISTMAS_DAYS = new Set();
  for (var year = 1969; year <= 2201; year++) {
    CHRISTMAS_DAYS.add(daysFromCivil(year, 12, 25));
  }

  IIC.register({
    id: 77,
    name: "Christmas Day-Number Set",
    cohort: "Lookup & Memoization",
    derive: "scratch",
    methodology: "At load time it computes, with Hinnant's integer days_from_civil formula, the epoch-day number of December 25 for every year from 1969 to 2201 and stores them in a Set. A vote floors localMs/86400000 to the visitor's local epoch-day and returns whether that integer is a member of the set.",
    flavor: "It keeps a guest list of all the Christmases and checks whether today's day-number is on it.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      return CHRISTMAS_DAYS.has(epochDay);
    }
  });
})();

/* #78 — Binary Search Christmas Array [Lookup & Memoization] */
(function () {
  // ---- Binary search over a precomputed Christmas-day index -----------------
  //
  // The plan: build a sorted array holding the integer epoch-day of every
  // December 25 across the supported year range, then answer each vote by
  // binary-searching the visitor's local epoch-day for an exact hit. If the
  // search lands on a stored value, the local civil date is Christmas.
  //
  // epoch-day = floor(localMs / 86400000), the integer day count since the
  // 1970-01-01 epoch. To populate the array we need the epoch-day of Dec 25 in
  // a given year; for that we use Howard Hinnant's days_from_civil, a closed
  // form that maps a proleptic-Gregorian (y, m, d) to its day offset from the
  // epoch with pure integer arithmetic and no calendar object.
  //
  //   days_from_civil(y, m, d):
  //     y -= (m <= 2)                       // shift so March starts the year
  //     era = floor((y >= 0 ? y : y-399)/400)
  //     yoe = y - era*400                    // year of era [0, 399]
  //     doy = (153*(m + (m > 2 ? -3 : 9)) + 2)/5 + d - 1   // day of year [0, 365]
  //     doe = yoe*365 + floor(yoe/4) - floor(yoe/100) + doy // day of era
  //     return era*146097 + doe - 719468
  //
  // The table is built once at load time. The gate samples local dates from
  // roughly 1972 through 2200, so the array spans a comfortably wider window.

  function daysFromCivil(y, m, d) {
    y -= (m <= 2) ? 1 : 0;
    var era = Math.floor((y >= 0 ? y : y - 399) / 400);
    var yoe = y - era * 400;
    var mp = (m > 2) ? (m - 3) : (m + 9);
    var doy = Math.floor((153 * mp + 2) / 5) + d - 1;
    var doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  }

  // Sorted array of Dec-25 epoch-days, one per year. Years increase, and
  // Dec 25 of year Y is always strictly earlier than Dec 25 of year Y+1, so the
  // array is monotonically increasing and binary-searchable as built.
  var FIRST_YEAR = 1900;
  var LAST_YEAR = 2400;
  var CHRISTMAS_DAYS = (function () {
    var arr = new Array(LAST_YEAR - FIRST_YEAR + 1);
    for (var y = FIRST_YEAR; y <= LAST_YEAR; y++) {
      arr[y - FIRST_YEAR] = daysFromCivil(y, 12, 25);
    }
    return arr;
  })();

  // Classic iterative binary search for an exact match. Returns true on a hit.
  function contains(sorted, target) {
    var lo = 0;
    var hi = sorted.length - 1;
    while (lo <= hi) {
      var mid = (lo + hi) >>> 1;
      var v = sorted[mid];
      if (v === target) return true;
      if (v < target) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  }

  IIC.register({
    id: 78,
    name: "Binary Search Christmas Array",
    cohort: "Lookup & Memoization",
    derive: "scratch",
    methodology: "At load time it precomputes a sorted array containing the integer epoch-day of December 25 for every year from 1900 to 2400, using Howard Hinnant's days_from_civil closed form to map each (year, 12, 25) to its day offset from 1970-01-01 with integer arithmetic. Each vote takes the visitor's local epoch-day as floor(localMs / 86400000) and runs an iterative binary search for an exact match in that array; a hit means the local civil date is Christmas.",
    flavor: "Keeps a sorted ledger of every Christmas from 1900 to 2400 and bisects its way to an answer in a dozen comparisons.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000); // days since 1970-01-01
      return contains(CHRISTMAS_DAYS, epochDay);
    }
  });
})();

/* #79 — Christmas Hash Map [Lookup & Memoization] */
(function () {
  // --- build a hash map (epochDay -> true) of every Christmas, once at load ---
  //
  // We need the integer count of days from the 1970-01-01 epoch to Dec 25 of a
  // given year, computed with arithmetic alone. Strategy:
  //   daysBeforeYear(y) = number of days from 1970-01-01 to Jan 1 of year y.
  //   Dec 25 is day-of-year index 358 (common) or 359 (leap), 0-based, because
  //   Jan..Nov is 334 days common / 335 leap, then Dec 25 is +24.
  // Sum those and you have the epoch-day key for that year's Christmas.

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // Days from 1970-01-01 to Jan 1 of year y (can be negative for y < 1970).
  // Counts leap days via the standard inclusive/exclusive Gregorian formula.
  function daysBeforeYear(y) {
    // leapsBefore(n) = number of leap years in [1, n-1] under the Gregorian rule.
    function leapsBefore(n) {
      var m = n - 1;
      return Math.floor(m / 4) - Math.floor(m / 100) + Math.floor(m / 400);
    }
    // Days from year 1's Jan 1 to year y's Jan 1.
    var daysFromYear1 = 365 * (y - 1) + leapsBefore(y);
    // 1970-01-01 is 719162 days after 0001-01-01 (proleptic Gregorian).
    return daysFromYear1 - 719162;
  }

  // Cover the full supported instant range (1970..2200) plus a one-year cushion
  // on each side, since a ±14h local offset can push the local civil date of a
  // boundary instant into the neighbouring year.
  var FIRST_YEAR = 1969;
  var LAST_YEAR = 2201;

  // The hash map. Plain object as a dictionary: stringified epoch-day -> true.
  var XMAS = Object.create(null);
  for (var y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    var decBeforeDec = isLeap(y) ? 335 : 334; // days in Jan..Nov
    var key = daysBeforeYear(y) + decBeforeDec + 24; // +24 -> the 25th
    XMAS[key] = true;
  }

  IIC.register({
    id: 79,
    name: "Christmas Hash Map",
    cohort: "Lookup & Memoization",
    derive: "scratch",
    methodology: "At load time it computes, with integer arithmetic over the Gregorian leap rule, the epoch-day number of December 25 for every year from 1969 to 2201 and stores each as a key in a hash map. A vote derives the visitor's local epoch-day as floor(localMs/86400000) and returns whether that day is present in the map.",
    flavor: "It precomputed every Christmas it will ever need and now just checks the guest list at the door.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      return XMAS[epochDay] === true;
    }
  });
})();

/* #80 — Bloom filter + verify [Lookup & Memoization] */
(function () {
  // Bloom filter + verify.
  //
  // A Bloom filter is a probabilistic set: it can say "definitely not a
  // member" or "probably a member", with a tunable false-positive rate but
  // never a false negative. We populate one with the integer epoch-day of
  // every December 25 in the supported range, then on a probable hit we run
  // an exact verification so the final answer is always correct.

  // --- exact epoch-day -> civil date (used both to seed the filter and to
  // --- verify a probable hit). Standard 400-year-era integer formulation,
  // --- shifting the epoch to 0000-03-01 so the leap day lands at year-end.
  function civilFromDays(z) {
    z += 719468;
    var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
    var doe = z - era * 146097;
    var yoe = Math.floor(
      (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
    );
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    var mp = Math.floor((5 * doy + 2) / 153);
    var d = doy - Math.floor((153 * mp + 2) / 5) + 1;
    var m = mp < 10 ? mp + 3 : mp - 9;
    return { m: m, d: d };
  }

  // Inverse: epoch-day of (year, 12, 25). days_from_civil for Dec 25.
  function decemberTwentyFifthDay(y) {
    var yy = y; // December is months 3..14 internal, but month >= 3 keeps yy as-is.
    var era = Math.floor((yy >= 0 ? yy : yy - 399) / 400);
    var yoe = yy - era * 400;
    // day-of-year for month 12, day 25 in the March-based scheme:
    // mp = m - 3 = 9 for December.
    var mp = 9;
    var doy = Math.floor((153 * mp + 2) / 5) + 25 - 1;
    var doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  }

  // --- Bloom filter sized for ~250 Christmas days at a low false-positive
  // --- rate. m bits, k = 2 hash functions. We use a bit array packed into
  // --- a Uint8Array. Two independent hashes derived from a single 32-bit
  // --- mix (Kirsch-Mitzenmacher double hashing: h1 + i*h2).
  var M_BITS = 4096;            // bit array size (power of two -> mask, not modulo)
  var M_MASK = M_BITS - 1;
  var bits = new Uint8Array(M_BITS >> 3); // 512 bytes

  function mix32(x) {
    // A small avalanche mix (variant of the murmur finalizer) over a 32-bit int.
    x = x | 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x45d9f3b);
    x ^= x >>> 16;
    x = Math.imul(x, 0x45d9f3b);
    x ^= x >>> 16;
    return x >>> 0;
  }

  function hashesFor(key) {
    // key is an epoch-day (can be negative for pre-1970). Fold to a 32-bit
    // value then derive two positions via double hashing.
    var base = mix32(key | 0);
    var h1 = base & M_MASK;
    var h2 = ((mix32(base ^ 0x9e3779b9) | 1)) & M_MASK; // odd step keeps it co-prime-ish
    var p2 = (h1 + h2) & M_MASK;
    return [h1, p2];
  }

  function setBit(pos) { bits[pos >> 3] |= (1 << (pos & 7)); }
  function getBit(pos) { return (bits[pos >> 3] >> (pos & 7)) & 1; }

  // Seed the filter with every Dec 25 across the supported span (and a
  // generous margin on each end so edge years near a zone boundary are safe).
  for (var y = 1968; y <= 2202; y++) {
    var ed = decemberTwentyFifthDay(y);
    var hs = hashesFor(ed);
    setBit(hs[0]);
    setBit(hs[1]);
  }

  IIC.register({
    id: 80,
    name: "Bloom filter + verify",
    cohort: "Lookup & Memoization",
    derive: "scratch",
    methodology: "At load time it precomputes the integer epoch-day of every December 25 from 1968 to 2202 and inserts each into a 4096-bit Bloom filter using two positions per key (a 32-bit avalanche mix plus Kirsch-Mitzenmacher double hashing). To vote it derives the local epoch-day from floor(localMs/86400000), checks whether both filter bits are set, and on a probable hit converts that epoch-day back to a civil date with the 400-year-era algorithm to confirm the month is 12 and the day is 25, eliminating false positives.",
    flavor: "The Bloom filter is happy to be wrong in one direction, so the verify step exists purely to keep it honest the other way.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var h = hashesFor(epochDay);
      // Probable miss: any bit unset means definitely not a Christmas day.
      if (!getBit(h[0]) || !getBit(h[1])) return false;
      // Probable hit: verify exactly.
      var c = civilFromDays(epochDay);
      return c.m === 12 && c.d === 25;
    }
  });
})();

/* #81 — Perfect hash of 231 days [Lookup & Memoization] */
(function () {
  // Perfect hash over every December 25 in the supported range.
  //
  // Strategy: there are only a few hundred Christmas epoch-days the gate can
  // ever ask about, so we enumerate them once and build a hash table that
  // collides for none of them. The table is then a perfect hash: each
  // Christmas day lands in its own slot, lookup is one modulo plus one compare,
  // and any non-Christmas day either misses the slot or finds a different day
  // stored there.

  // days_from_civil: the inverse of Hinnant's civil_from_days. Converts a
  // proleptic-Gregorian (year, month, day) to days since 1970-01-01 with pure
  // integer arithmetic, so we can generate the Christmas days without touching
  // Date or Intl. Reference: howardhinnant.github.io/date_algorithms.html
  function daysFromCivil(y, m, d) {
    var yy = m <= 2 ? y - 1 : y;
    var era = Math.floor((yy >= 0 ? yy : yy - 399) / 400);
    var yoe = yy - era * 400;
    var doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
    var doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  }

  // The gate spans years 1970..2200; a local civil date can spill one year
  // past either edge under the UTC-12..UTC+14 offset range, so we cover
  // 1969..2201 to be safe. That is 233 December-25 days.
  var FIRST_YEAR = 1969;
  var LAST_YEAR = 2201;

  // M is the smallest modulus (found offline by a linear scan) for which
  // day % M is collision-free across all 233 Christmas days. With 233 keys in
  // 364 slots the load factor is about 0.64, comfortably inside one table.
  var M = 364;

  // Build the table once. SLOT holds the actual epoch-day stored at each
  // position, or a sentinel that no real Christmas day can equal.
  var EMPTY = -2147483648;
  var SLOT = new Float64Array(M);
  for (var i = 0; i < M; i++) SLOT[i] = EMPTY;

  for (var y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    var day = daysFromCivil(y, 12, 25);
    var h = ((day % M) + M) % M; // non-negative modulo; days can be negative
    SLOT[h] = day;               // perfect hash guarantees no overwrite
  }

  IIC.register({
    id: 81,
    name: "Perfect hash of 231 days",
    cohort: "Lookup & Memoization",
    derive: "scratch",
    methodology: "At load time it converts December 25 of every year from 1969 to 2201 into an epoch-day count via Hinnant's days_from_civil, then stores each in a 364-slot table keyed by day mod 364, a modulus chosen so the 233 Christmas days never collide. A vote takes floor(localMs / 86400000), hashes it the same way, and returns true only if the stored day in that slot is exactly equal.",
    flavor: "It memorized every Christmas between 1969 and 2201 so it would never have to think about the calendar again.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var h = ((epochDay % M) + M) % M;
      return SLOT[h] === epochDay;
    }
  });
})();

/* #82 — Day-of-year bitmap [Lookup & Memoization] */
(function () {
  // Day-of-year bitmap.
  //
  // Step 1: turn floor(localMs / 86400000) -- days since the 1970-01-01
  // epoch -- into a (year, dayOfYear) pair using only integer arithmetic.
  // We walk forward or backward from 1970 in whole years, subtracting each
  // year's length (365, or 366 for a leap year) until the remaining day
  // count lands inside a single year. What's left is the 0-indexed
  // day-of-year. The walk is bounded by the harness's 1970..2200 range, so
  // it never iterates more than a few hundred times.
  //
  // Step 2: index a 366-bit bitmap. We keep two bitmaps -- one for common
  // years, one for leap years -- because Dec 25 is day-of-year 358 in a
  // common year and 359 in a leap year (0-indexed), the leap day in
  // February having shoved every later date back by one. Each bitmap is
  // stored as an array of 32-bit words; the relevant Dec-25 bit is the
  // only bit set. The vote is a single bit test.

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function daysInYear(y) {
    return isLeap(y) ? 366 : 365;
  }

  // Build the two bitmaps once, at load time. 366 bits -> 12 words of 32.
  var WORDS = 12;
  function makeBitmap(decBitIndex) {
    var words = new Array(WORDS);
    for (var i = 0; i < WORDS; i++) words[i] = 0;
    var w = decBitIndex >> 5;        // which 32-bit word
    var b = decBitIndex & 31;        // which bit within the word
    words[w] = words[w] | (1 << b);
    return words;
  }
  // Dec 25 0-indexed day-of-year: 358 common, 359 leap.
  var BITMAP_COMMON = makeBitmap(358);
  var BITMAP_LEAP = makeBitmap(359);

  function bitSet(words, idx) {
    if (idx < 0 || idx >= WORDS * 32) return false;
    var w = idx >> 5;
    var b = idx & 31;
    return (words[w] & (1 << b)) !== 0;
  }

  // Resolve (year, dayOfYear) from an integer day count since 1970-01-01.
  function resolve(epochDay) {
    var year = 1970;
    var day = epochDay; // remaining days into `year`
    if (day >= 0) {
      // Walk forward, subtracting whole years until `day` fits inside one.
      var len = daysInYear(year);
      while (day >= len) {
        day -= len;
        year++;
        len = daysInYear(year);
      }
    } else {
      // Negative: walk backward into earlier years.
      while (day < 0) {
        year--;
        day += daysInYear(year);
      }
    }
    return { year: year, doy: day }; // doy is 0-indexed
  }

  IIC.register({
    id: 82,
    name: "Day-of-year bitmap",
    cohort: "Lookup & Memoization",
    derive: "scratch",
    methodology: "Takes floor(localMs / 86400000) as days since 1970-01-01 and subtracts whole-year lengths (365 or 366 by the Gregorian leap rule) to resolve the civil year and the 0-indexed day-of-year. It then indexes one of two precomputed 366-bit bitmaps (common-year or leap-year), each with a single bit set at Dec 25's day-of-year (358 common, 359 leap); the vote is that bit test.",
    flavor: "A whole bitmap allocated to remember the location of exactly one bit, which is either thrifty or absurd depending on how you feel about Christmas.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var r = resolve(epochDay);
      var map = isLeap(r.year) ? BITMAP_LEAP : BITMAP_COMMON;
      return bitSet(map, r.doy);
    }
  });
})();

/* #83 — Run-Length-Encoded Calendar [Lookup & Memoization] */
(function () {
  // Run-length-encoded calendar.
  //
  // The whole point: never store 365 booleans for "is this day Christmas?".
  // Instead store the year as three runs -- (not-christmas, christmas,
  // not-christmas) -- and decode that RLE to answer the question.
  //
  // Step 1: turn the local epoch-day into a (year, zero-based day-of-year).
  // Walk 365/366-day year blocks out from 1970, forward for non-negative day
  // counts and backward for pre-1970 ones, until the remaining count fits inside
  // a single year. The leftover is the day-of-year (doy).
  //
  // Step 2: build the year's RLE. Dec 25 is the 359th day of a common year and
  // the 360th of a leap year, i.e. zero-based index 358 / 359. So the runs are
  //   [ xmasIndex, 1, (yearLength - xmasIndex - 1) ]
  // which is [358, 1, 6] for a common year (sum 365) and [359, 1, 6] for a leap
  // year (sum 366). Run 0 is not-christmas, run 1 is christmas, run 2 is the tail
  // of not-christmas.
  //
  // Step 3: decode the RLE by accumulating run lengths until the cumulative sum
  // passes doy, identifying which run doy lands in. Vote yes iff that run is the
  // middle (christmas) run.

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function yearLen(y) {
    return isLeap(y) ? 366 : 365;
  }

  // The two possible run-length tables, keyed by leap-ness. Built once at load.
  // Layout: [ [runLength, isChristmasRun], ... ]. Two runs would suffice for a
  // pure membership test, but the spec calls for the (no, yes, no) shape, so we
  // keep all three runs explicitly.
  function buildRle(leap) {
    var len = leap ? 366 : 365;
    var xmasIndex = leap ? 359 : 358; // zero-based day-of-year for Dec 25
    return [
      [xmasIndex, false],            // run 0: Jan 1 .. Dec 24
      [1, true],                     // run 1: Dec 25
      [len - xmasIndex - 1, false]   // run 2: Dec 26 .. Dec 31
    ];
  }

  var RLE_COMMON = buildRle(false);
  var RLE_LEAP = buildRle(true);

  IIC.register({
    id: 83,
    name: "Run-Length-Encoded Calendar",
    cohort: "Lookup & Memoization",
    derive: "scratch",
    methodology: "Converts the local epoch-day to a year and zero-based day-of-year by peeling off 365/366-day year blocks out from 1970, then represents the year as three run-length segments (not-Christmas, the single Christmas day, not-Christmas) where the middle run starts at day-of-year 358 in common years and 359 in leap years; it decodes the runs by accumulating their lengths and votes yes only when the day-of-year falls inside the middle run.",
    flavor: "It compresses the entire year into three numbers, which is either admirable thrift or proof that 363 of those days are beneath its notice.",
    vote: function (ctx) {
      // Integer day count since 1970-01-01 in LOCAL wall-clock terms.
      var epochDay = Math.floor(ctx.localMs / 86400000);

      // Resolve (year, zero-based day-of-year).
      var year = 1970;
      var doy = epochDay; // days relative to Jan 1 of `year`

      if (doy >= 0) {
        for (var guardF = 0; guardF < 2000; guardF++) {
          var lenF = yearLen(year);
          if (doy < lenF) break;
          doy -= lenF;
          year++;
        }
      } else {
        for (var guardB = 0; guardB < 2000; guardB++) {
          year--;
          doy += yearLen(year);
          if (doy >= 0) break;
        }
      }

      // Decode the run-length encoding for this year's leap-ness.
      var rle = isLeap(year) ? RLE_LEAP : RLE_COMMON;
      var cursor = 0; // start day-of-year of the current run
      for (var r = 0; r < rle.length; r++) {
        var runLen = rle[r][0];
        var isXmasRun = rle[r][1];
        if (doy < cursor + runLen) {
          // doy lands inside run r.
          return isXmasRun;
        }
        cursor += runLen;
      }

      // doy beyond the encoded year (shouldn't happen for a valid doy).
      return false;
    }
  });
})();

/* #84 — Christmas Interval Table [Lookup & Memoization] */
(function () {
  // Interval-ranges approach. We pick a year span that comfortably covers the
  // gate's supported instants (1970..2200 in local civil terms, with a margin
  // on each side because a UTC instant near a boundary can land in an adjacent
  // local year). For every year in that span we precompute, from scratch,
  // the integer epoch-day on which Jan 1 of that year falls. From those we can
  // derive two parallel tables:
  //   jan1[i]  = epoch-day of <year> Jan 1     (the cumulative day count)
  //   xmas[i]  = epoch-day of <year> Dec 25    (jan1 + 358 or 359, leap-aware)
  // Each Dec 25 is a half-open interval [xmas, xmas+1) of epoch-days. To vote,
  // we take the current local epoch-day, binary-search the jan1 table to find
  // which calendar year it belongs to, then test whether it falls inside that
  // year's precomputed Christmas interval.
  //
  // The from-scratch part is the cumulative day count: starting from a known
  // anchor (1970-01-01 == epoch-day 0, a Thursday by construction of the Unix
  // epoch) we walk year by year adding 365 or 366 days using the Gregorian
  // leap rule, never touching Date/Intl.

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  var FIRST_YEAR = 1968;   // a little margin below 1970
  var LAST_YEAR = 2202;    // a little margin above 2200
  var N = LAST_YEAR - FIRST_YEAR + 1;

  // jan1[i] = epoch-day count for FIRST_YEAR + i on Jan 1.
  // xmas[i] = epoch-day count for FIRST_YEAR + i on Dec 25.
  var jan1 = new Array(N);
  var xmas = new Array(N);

  // Anchor: epoch-day 0 is 1970-01-01. Walk backwards to FIRST_YEAR, then
  // forwards to fill the table. We compute Jan 1 of 1970 = 0, and accumulate.
  // First find Jan 1 of FIRST_YEAR relative to 1970.
  var dayCount = 0;
  if (FIRST_YEAR <= 1970) {
    for (var y = 1970; y > FIRST_YEAR; y--) {
      dayCount -= isLeap(y - 1) ? 366 : 365;
    }
  } else {
    for (var y2 = 1970; y2 < FIRST_YEAR; y2++) {
      dayCount += isLeap(y2) ? 366 : 365;
    }
  }
  // dayCount now = epoch-day of FIRST_YEAR Jan 1.

  for (var i = 0; i < N; i++) {
    var year = FIRST_YEAR + i;
    jan1[i] = dayCount;
    // Dec 25 is the 359th day of a common year (0-indexed 358) and the 360th
    // of a leap year (0-indexed 359), because Feb gains a day before December.
    var doyDec25 = isLeap(year) ? 359 : 358;
    xmas[i] = dayCount + doyDec25;
    dayCount += isLeap(year) ? 366 : 365;
  }

  // Binary-search jan1 for the largest index whose Jan-1 epoch-day is <= d.
  // That index's year is the calendar year containing epoch-day d.
  function yearIndexFor(d) {
    var lo = 0;
    var hi = N - 1;
    // Out-of-range guards (should not happen within the supported span).
    if (d < jan1[0]) return -1;
    if (d >= jan1[N - 1] + (isLeap(LAST_YEAR) ? 366 : 365)) return -1;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (jan1[mid] <= d) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }

  IIC.register({
    id: 84,
    name: "Christmas Interval Table",
    cohort: "Lookup & Memoization",
    derive: "scratch",
    methodology: "At load time, walks the Gregorian calendar year by year from a margin around 1968..2202 to build a cumulative epoch-day count for each Jan 1, and from it the half-open epoch-day interval [Dec25, Dec25+1) for every year (using day-of-year 358 in common years, 359 in leap years). To vote, it takes floor(localMs/86400000), binary-searches the Jan-1 table to find the containing calendar year, and returns true if that day equals the year's precomputed Christmas day.",
    flavor: "It keeps two and a half centuries of Christmases in a table just to avoid doing arithmetic at vote time, which is either thrift or hoarding depending on your view.",
    vote: function (ctx) {
      var d = Math.floor(ctx.localMs / 86400000);
      var idx = yearIndexFor(d);
      if (idx < 0) return false;
      return d === xmas[idx];
    }
  });
})();

/* #85 — Memoized Year Resolver [Lookup & Memoization] */
(function () {
  // Memoized year resolver.
  //
  // The whole problem reduces to "which civil year, and how far into it, is
  // this epoch day?" The expensive part of answering that repeatedly is
  // recomputing how many days sit between 1970-01-01 and the start of year Y.
  // So we memoize: yearStartCache[Y] holds the epoch-day index of Y-01-01
  // (days since 1970-01-01, which is itself day 0). Once a year's start is in
  // the cache, locating any instant in that year is a couple of comparisons
  // and a table lookup, i.e. O(1) amortized across calls.

  var DAY_MS = 86400000;

  // Days in each month for common / leap years (index 0 = January).
  var COMMON = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var LEAP   = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Cumulative day-of-year at the *start* of each month, 0-based. Element i is
  // the number of days in the year before month i begins. Built once.
  function buildCumulative(months) {
    var c = [0];
    for (var i = 0; i < 12; i++) c.push(c[i] + months[i]);
    return c; // length 13; c[12] == days in year
  }
  var CUM_COMMON = buildCumulative(COMMON);
  var CUM_LEAP   = buildCumulative(LEAP);

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }
  function daysInYear(y) {
    return isLeap(y) ? 366 : 365;
  }

  // Memoization cache: year -> epoch-day index of that year's January 1.
  // 1970-01-01 is epoch day 0, our anchor.
  var yearStartCache = { 1970: 0 };

  // Return the epoch-day index of Y-01-01, filling the cache from the 1970
  // anchor toward the target one year at a time. Every intermediate year-start
  // is stored, so the cache densifies as it is used and later lookups in the
  // same range are immediate. We always walk from 1970 (the seed that is
  // guaranteed present) rather than scanning for a nearer anchor, which keeps
  // the fill direction unambiguous for years on either side of 1970.
  function yearStart(year) {
    var cached = yearStartCache[year];
    if (cached !== undefined) return cached;

    var acc;
    if (year > 1970) {
      // Walk forward from the highest contiguous cached year up to target.
      var y = 1970;
      while (yearStartCache[y + 1] !== undefined) y++; // skip already-filled
      acc = yearStartCache[y];
      for (; y < year; y++) {
        acc += daysInYear(y);
        yearStartCache[y + 1] = acc;
      }
    } else {
      // year < 1970: walk backward from the lowest contiguous cached year.
      var yb = 1970;
      while (yearStartCache[yb - 1] !== undefined) yb--; // skip already-filled
      acc = yearStartCache[yb];
      for (; yb > year; yb--) {
        acc -= daysInYear(yb - 1);
        yearStartCache[yb - 1] = acc;
      }
    }
    return yearStartCache[year];
  }

  // Resolve which civil year contains the given epoch day, using a cheap
  // estimate as a starting guess and then nudging via the memoized year-starts
  // until epochDay lands inside [yearStart(year), yearStart(year+1)).
  function yearOf(epochDay) {
    // 365.2425 days per Gregorian year on average; this estimate is at most a
    // year or so off, so the correction loop below runs only a handful of
    // times regardless of how far from 1970 we are.
    var year = 1970 + Math.floor(epochDay / 365.2425);

    while (epochDay < yearStart(year)) year--;
    while (epochDay >= yearStart(year + 1)) year++;
    return year;
  }

  function isDec25(epochDay) {
    var year = yearOf(epochDay);
    var doy = epochDay - yearStart(year); // 0-based day of year

    var cum = isLeap(year) ? CUM_LEAP : CUM_COMMON;

    // December is month index 11; resolve the month from the residual day-of-
    // year, then check the day within the month. December 25 is the 24th day
    // (0-based) of month 11, so its day-of-year is cum[11] + 24.
    return doy === cum[11] + 24;
  }

  IIC.register({
    id: 85,
    name: "Memoized Year Resolver",
    cohort: "Lookup & Memoization",
    derive: "scratch",
    methodology: "Reduces the local instant to an integer epoch day via Math.floor(ctx.localMs/86400000), then resolves the civil year using a cache that memoizes each year's January-1 epoch-day index (anchored at 1970-01-01 = day 0, extended one year at a time with the Gregorian leap rule and densified as it is queried). A 365.2425-day estimate seeds the year guess, the memoized year-starts confirm it, and the residual day-of-year is matched against a precomputed cumulative-month table; it votes yes when that residual equals December 25's day-of-year for the resolved year.",
    flavor: "It pays the cost of counting days to a year boundary exactly once, files the answer away, and bills every later visitor at the cached rate.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / DAY_MS);
      return isDec25(epochDay);
    }
  });
})();

/* #86 — Honest IANA Intl [Intl & Locale] */
(function () {
  // The honest, idiomatic timezone-aware answer.
  //
  // Instead of pivoting on the localMs trick, this hands the real UTC
  // instant (ctx.epochMs) and the visitor's IANA zone (ctx.timeZone)
  // straight to Intl.DateTimeFormat and lets the locale machinery do the
  // zone math. We ask only for the numeric month and day in en-US, then
  // read them back via formatToParts. en-US is irrelevant to the numbers
  // themselves; we just need a locale whose 'numeric' fields are plain
  // base-10 integers, and US English qualifies.
  //
  // One DateTimeFormat object per distinct zone is cached at call time so
  // the ~148k-sample gate and the ~121-vote page load don't reconstruct a
  // formatter on every invocation.

  var FMT_CACHE = Object.create(null);

  function formatterFor(tz) {
    var f = FMT_CACHE[tz];
    if (f === undefined) {
      f = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        month: 'numeric',
        day: 'numeric'
      });
      FMT_CACHE[tz] = f;
    }
    return f;
  }

  IIC.register({
    id: 86,
    name: "Honest IANA Intl",
    cohort: "Intl & Locale",
    derive: "intl",
    methodology: "Feeds the true UTC instant (ctx.epochMs) and the visitor's IANA zone (ctx.timeZone) to Intl.DateTimeFormat('en-US', {timeZone, month:'numeric', day:'numeric'}) and reads month and day back via formatToParts. The vote is true when month is 12 and day is 25. No localMs trick; the locale layer resolves the zone, including December DST in the southern hemisphere.",
    flavor: "The boring, correct way to do this, which is presumably why the other 120 algorithms exist.",
    vote: function (ctx) {
      var parts = formatterFor(ctx.timeZone).formatToParts(new Date(ctx.epochMs));
      var month = 0;
      var day = 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.type === 'month') month = Number(p.value);
        else if (p.type === 'day') day = Number(p.value);
      }
      return month === 12 && day === 25;
    }
  });
})();

/* #87 — German locale 25.12. [Intl & Locale] */
(function () {
  // Build the formatter once at load time. German short date format renders
  // as "DD.MM.YYYY" (e.g. "25.12.2026"). We force timeZone:'UTC' so that
  // feeding new Date(ctx.localMs) — whose UTC breakdown equals the visitor's
  // local civil time — yields the local wall-clock date, independent of the
  // machine the gate runs on.
  var fmt = new Intl.DateTimeFormat("de-DE", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  IIC.register({
    id: 87,
    name: "German locale 25.12.",
    cohort: "Intl & Locale",
    derive: "intl",
    methodology: "Formats new Date(ctx.localMs) with Intl.DateTimeFormat('de-DE', {timeZone:'UTC', day:'2-digit', month:'2-digit'}), which produces the German DD.MM. date notation. It splits the string on the period separator and votes yes when the day field is 25 and the month field is 12.",
    flavor: "Germany writes the day before the month and ends it with a full stop, which is the most German way imaginable to assert that today is the 25th of the 12th.",
    vote: function (ctx) {
      // de-DE numeric/2-digit format is "DD.MM.YYYY".
      var s = fmt.format(new Date(ctx.localMs));
      var parts = s.split(".");
      if (parts.length < 2) return false;
      var day = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10);
      return day === 25 && month === 12;
    }
  });
})();

/* #88 — Japanese Locale (12月25日) [Intl & Locale] */
(function () {
  // One reusable formatter, built once at load time. 'ja-JP' with a UTC time zone
  // turns ctx.localMs (an epoch whose UTC breakdown equals the visitor's local wall
  // clock) into a Japanese long date such as "12月25日": month, the kanji 月, day,
  // the kanji 日. We pin timeZone:'UTC' so the gate's machine zone never leaks in.
  var JP = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric'
  });

  // Pull the numeric month and day straight out of the localized parts rather than
  // string-matching the whole rendering, so a stray "25" elsewhere can never fool us.
  function fields(localMs) {
    var parts = JP.formatToParts(new Date(localMs));
    var month = NaN, day = NaN;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.type === 'month') month = parseInt(p.value, 10);
      else if (p.type === 'day') day = parseInt(p.value, 10);
    }
    return { month: month, day: day };
  }

  IIC.register({
    id: 88,
    name: "Japanese Locale (12月25日)",
    cohort: "Intl & Locale",
    derive: "intl",
    methodology: "Formats ctx.localMs with Intl.DateTimeFormat('ja-JP', { timeZone: 'UTC', month: 'long', day: 'numeric' }), which renders the visitor's local civil date as a Japanese long date like 12月25日. It reads the month and day back out of formatToParts and votes yes when the month is 12 and the day is 25.",
    flavor: "If the kanji say twelfth-month twenty-fifth-day, that is good enough for Santa.",
    vote: function (ctx) {
      var f = fields(ctx.localMs);
      return f.month === 12 && f.day === 25;
    }
  });
})();

/* #89 — French locale 25/12 [Intl & Locale] */
(function () {
  // Build the formatter once at load time. The fr-FR short numeric date
  // renders as "DD/MM/YYYY" (e.g. "25/12/2026"). We force timeZone:'UTC' so
  // that feeding new Date(ctx.localMs) — whose UTC breakdown equals the
  // visitor's local civil time — yields the local wall-clock date regardless
  // of the timezone the gate machine runs in.
  var fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  IIC.register({
    id: 89,
    name: "French locale 25/12",
    cohort: "Intl & Locale",
    derive: "intl",
    methodology: "Formats new Date(ctx.localMs) with Intl.DateTimeFormat('fr-FR', {timeZone:'UTC', day:'2-digit', month:'2-digit'}), which produces the French DD/MM date notation. It splits the string on the slash separator and votes yes when the day field is 25 and the month field is 12.",
    flavor: "The French put the day first and join it with slashes, so noel arrives as a tidy 25/12 well before anyone reaches for the month.",
    vote: function (ctx) {
      // fr-FR numeric/2-digit format is "DD/MM/YYYY".
      var s = fmt.format(new Date(ctx.localMs));
      var parts = s.split("/");
      if (parts.length < 2) return false;
      var day = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10);
      return day === 25 && month === 12;
    }
  });
})();

/* #90 — Hebrew calendar cross-check [Intl & Locale] */
(function () {
  // Two Intl.DateTimeFormat objects, both pinned to timeZone:'UTC' and fed
  // new Date(ctx.localMs). Because localMs is the epoch whose UTC breakdown
  // equals the visitor's local wall clock, formatting it as UTC yields the
  // local civil date, independent of where the gate or browser runs.
  //
  // The DECISION is made on the explicit Gregorian ('gregory') calendar:
  // Christmas is a Gregorian-calendar fact, so we read its numeric month and
  // day and vote yes only for 12/25. The Hebrew ('hebrew') calendar formatter
  // is a cross-check companion: we compute the Hebrew date for the same
  // instant so the verdict can be reported alongside its Hebrew-calendar
  // equivalent. The Hebrew date never changes the vote; if it ever did, a
  // year like Tevet 5787 would disagree with itself across leap years.

  var greg = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone: "UTC",
    month: "numeric",
    day: "numeric"
  });

  var hebrew = new Intl.DateTimeFormat("en-US-u-ca-hebrew", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  function gregMonthDay(date) {
    var parts = greg.formatToParts(date);
    var month = 0;
    var day = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.type === "month") month = Number(p.value);
      else if (p.type === "day") day = Number(p.value);
    }
    return { month: month, day: day };
  }

  IIC.register({
    id: 90,
    name: "Hebrew calendar cross-check",
    cohort: "Intl & Locale",
    derive: "intl",
    methodology: "Formats new Date(ctx.localMs) with Intl.DateTimeFormat using calendar 'gregory' and timeZone 'UTC' to read the local civil month and day, voting yes only on 12/25. A second formatter with calendar 'hebrew' renders the same instant as its Hebrew-calendar date (for example '15 Tevet 5787') purely as a reported cross-check; the Hebrew date is computed but never used to decide the vote.",
    flavor: "It double-checks Christmas against the Hebrew calendar, which has its own strong opinions about December and is not consulted on any of them.",
    vote: function (ctx) {
      var date = new Date(ctx.localMs);
      // Cross-check companion: compute the Hebrew-calendar rendering of the
      // same civil instant. Not used in the verdict, only available for
      // display ("today is also <hebrew> in the Hebrew calendar").
      hebrew.format(date);
      var md = gregMonthDay(date);
      return md.month === 12 && md.day === 25;
    }
  });
})();

/* #91 — Hijri cross-check, Gregorian verdict [Intl & Locale] */
(function () {
  // The decision is made on the Gregorian calendar. We feed
  // new Date(ctx.localMs) — whose UTC breakdown equals the visitor's local
  // civil wall clock — to an Intl.DateTimeFormat pinned to timeZone:'UTC'
  // and calendar:'gregory', then read the month/day fields back via
  // formatToParts. Pinning timeZone is required: without it the formatter
  // would re-resolve against the gate machine's zone and disagree with each
  // sample's zone.
  var gregFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    calendar: "gregory",
    month: "numeric",
    day: "numeric"
  });

  // The Islamic-calendar cross-check is computed for color, not for the
  // verdict. The Gregorian Dec 25 drifts ~11 days earlier each year against
  // the Hijri calendar, so there is no fixed Hijri date that means Christmas;
  // we format it only to confirm the same instant resolves on both calendars.
  var hijriFmt = new Intl.DateTimeFormat("en-US-u-ca-islamic", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });

  IIC.register({
    id: 91,
    name: "Hijri cross-check, Gregorian verdict",
    cohort: "Intl & Locale",
    derive: "intl",
    methodology: "Formats new Date(ctx.localMs) with Intl.DateTimeFormat('en-US', {timeZone:'UTC', calendar:'gregory', month:'numeric', day:'numeric'}) and reads the numeric month and day back via formatToParts, voting yes when month is 12 and day is 25. A parallel Intl formatter on the Islamic ('islamic') calendar renders the same instant's Hijri date as a sanity cross-check, but the verdict rests entirely on the explicit Gregorian format with its explicit UTC timeZone.",
    flavor: "It dutifully prints the Hijri date next to the verdict, mostly to remind you that 25 December means nothing to a calendar that wandered off eleven days ago.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);

      // Cross-check: resolve the instant on the Islamic calendar too. We read
      // it so the formatter is genuinely exercised, but it does not gate the
      // result; the Hijri date has no fixed correspondence to Christmas.
      var hijri = hijriFmt.formatToParts(d);
      var hijriDay = 0;
      for (var j = 0; j < hijri.length; j++) {
        if (hijri[j].type === "day") hijriDay = Number(hijri[j].value);
      }
      var crossCheckOk = hijriDay >= 1 && hijriDay <= 30;

      // Verdict: explicit Gregorian format, explicit UTC timeZone.
      var parts = gregFmt.formatToParts(d);
      var month = 0;
      var day = 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.type === "month") month = Number(p.value);
        else if (p.type === "day") day = Number(p.value);
      }

      return crossCheckOk && month === 12 && day === 25;
    }
  });
})();

/* #92 — Japanese era calendar [Intl & Locale] */
(function () {
  // Two formatters, both pinned to timeZone:'UTC' and fed new Date(ctx.localMs).
  // Because localMs is epochMs shifted so its UTC breakdown equals the visitor's
  // local wall clock, a UTC-pinned formatter reads the local civil date no matter
  // what zone the gate machine runs in.
  //
  // The Japanese era calendar (ca-japanese) renders the date in nengo terms, e.g.
  // "令和8/12/25" for 2026-12-25. The era/year split is the gimmick of this voter.
  // But the era calendar shares the Gregorian month and day, and parsing CJK era
  // names is brittle, so the actual decision is made on an explicit Gregorian
  // (ca-gregory) format of the same instant, read numerically via formatToParts.
  var jpFmt = new Intl.DateTimeFormat("ja-JP-u-ca-japanese", {
    timeZone: "UTC",
    era: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });

  var gregFmt = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone: "UTC",
    month: "numeric",
    day: "numeric"
  });

  IIC.register({
    id: 92,
    name: "Japanese era calendar",
    cohort: "Intl & Locale",
    derive: "intl",
    methodology: "Formats new Date(ctx.localMs) with Intl.DateTimeFormat using the Japanese era calendar (ja-JP-u-ca-japanese, timeZone:'UTC') so the year is expressed in nengo terms, then recovers the unambiguous Gregorian month and day from an explicit Gregorian formatter (en-US-u-ca-gregory, timeZone:'UTC') of the same instant via formatToParts. The vote is true when that Gregorian month is 12 and day is 25.",
    flavor: "It dutifully figures out which imperial era you're in, then quietly ignores that and checks the Gregorian date like everyone else.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);

      // Read the Japanese era breakdown. We don't decide on it (era-name parsing
      // is fragile), but invoking it is the whole point of this algorithm and it
      // exercises the era calendar on the same instant we're about to judge.
      jpFmt.format(d);

      // Decide on the explicit Gregorian month/day.
      var parts = gregFmt.formatToParts(d);
      var month = 0;
      var day = 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.type === "month") month = Number(p.value);
        else if (p.type === "day") day = Number(p.value);
      }
      return month === 12 && day === 25;
    }
  });
})();

/* #93 — Minguo 民國 12/25 [Intl & Locale] */
(function () {
  // The ROC (Minguo / 民國) calendar of Taiwan keeps the Gregorian month and
  // day exactly and only renumbers the year: ROC year = Gregorian year - 1911,
  // so 25 December 2026 is "民國115/12/25". Because the month/day never shift,
  // the Minguo question "is it 12/25?" is identical to the Gregorian one. We
  // lean on that fact: the vote is decided by an EXPLICIT Gregorian formatter
  // with an EXPLICIT timeZone, while a ROC formatter is built alongside it for
  // the calendar flavor the algorithm is named for.
  //
  // Both formatters use timeZone:'UTC' and read new Date(ctx.localMs). Since
  // localMs is the epoch whose UTC breakdown equals the visitor's local civil
  // time, this yields the local wall-clock date no matter which zone the gate
  // runs in. The locale 'en-US-u-ca-gregory' pins the calendar to Gregorian
  // and gives plain base-10 numeric month/day fields.

  var greg = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone: "UTC",
    month: "numeric",
    day: "numeric"
  });

  // Built for flavor: confirms the same instant reads as month 12 / day 25 in
  // the Minguo calendar too. Not load-bearing for the vote, but it keeps the
  // ROC name honest.
  var roc = new Intl.DateTimeFormat("zh-TW-u-ca-roc", {
    timeZone: "UTC",
    month: "numeric",
    day: "numeric"
  });

  function monthDay(fmt, d) {
    var parts = fmt.formatToParts(d);
    var month = 0;
    var day = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.type === "month") month = Number(p.value);
      else if (p.type === "day") day = Number(p.value);
    }
    return month === 12 && day === 25;
  }

  IIC.register({
    id: 93,
    name: "Minguo 民國 12/25",
    cohort: "Intl & Locale",
    derive: "intl",
    methodology: "Decides with an explicit Gregorian formatter, Intl.DateTimeFormat('en-US-u-ca-gregory', {timeZone:'UTC', month:'numeric', day:'numeric'}), reading new Date(ctx.localMs) so the UTC breakdown equals the visitor's local civil date. It votes yes when month is 12 and day is 25. A parallel zh-TW-u-ca-roc (Minguo) formatter confirms the same instant, which works because the ROC calendar reuses Gregorian months and days and only renumbers the year as Gregorian minus 1911.",
    flavor: "Taiwan files Christmas under 民國115, but the 12/25 underneath never moved an inch.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      // Gregorian decision (explicit calendar, explicit timeZone).
      var gregYes = monthDay(greg, d);
      // ROC reuses the same month/day, so this must agree; require both.
      var rocYes = monthDay(roc, d);
      return gregYes && rocYes;
    }
  });
})();

/* #94 — Days-until-Christmas == 0 [Intl & Locale] */
(function () {
  // Build the formatters once at load time. We read the visitor's LOCAL civil
  // date by formatting new Date(ctx.localMs) with timeZone:'UTC' — localMs is
  // the epoch whose UTC breakdown equals the local wall clock, so 'UTC' here is
  // exactly right and makes the result independent of the gate machine's zone.
  var dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });

  // RelativeTimeFormat is used purely to narrate the day delta (e.g. "today",
  // "in 3 days"). It does not decide the vote; the integer delta does.
  var hasRTF = typeof Intl.RelativeTimeFormat === "function";
  var rtf = hasRTF ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }) : null;

  // Days from the civil date 1970-01-01 to year-month-day, proleptic Gregorian.
  // (Howard Hinnant's days_from_civil.) Pure integer arithmetic, no Date/Intl.
  function daysFromCivil(y, m, d) {
    y = m <= 2 ? y - 1 : y;
    var era = Math.floor((y >= 0 ? y : y - 399) / 400);
    var yoe = y - era * 400;
    var doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
    var doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  }

  IIC.register({
    id: 94,
    name: "Days-until-Christmas == 0",
    cohort: "Intl & Locale",
    derive: "intl",
    methodology: "Reads the local civil year, month, and day from Intl.DateTimeFormat('en-US', {timeZone:'UTC'}).formatToParts(new Date(ctx.localMs)), converts both that date and December 25 of the same year to epoch-day counts, and votes yes when their whole-day difference is 0. Intl.RelativeTimeFormat narrates the delta as a human phrase but does not affect the vote.",
    flavor: "It counts the sleeps until Christmas and only believes it has arrived when there are none left.",
    vote: function (ctx) {
      var parts = dateFmt.formatToParts(new Date(ctx.localMs));
      var y = 0, mo = 0, d = 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.type === "year") y = parseInt(p.value, 10);
        else if (p.type === "month") mo = parseInt(p.value, 10);
        else if (p.type === "day") d = parseInt(p.value, 10);
      }
      if (!y || !mo || !d) return false;

      var todayDay = daysFromCivil(y, mo, d);
      var christmasDay = daysFromCivil(y, 12, 25);
      var deltaDays = christmasDay - todayDay;

      // Narrate for the writeup/UI; result is discarded, the integer decides.
      if (rtf) { rtf.format(deltaDays, "day"); }

      return deltaDays === 0;
    }
  });
})();

/* #95 — formatToParts Reducer [Intl & Locale] */
(function () {
  // One formatter, built once at load time. We pin timeZone:'UTC' and feed it
  // ctx.localMs, whose UTC breakdown already equals the visitor's local wall
  // clock, so the gate machine's own zone never leaks into the result. 'en-US'
  // with numeric month/day emits parts whose values are plain integers.
  var FMT = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'numeric',
    day: 'numeric'
  });

  // Reduce formatToParts' array into a keyed object: { month: "12", day: "25",
  // literal: "/" }. Then we only have to read two named slots instead of caring
  // about ordering or locale punctuation.
  function partsToObject(localMs) {
    return FMT.formatToParts(new Date(localMs)).reduce(function (acc, part) {
      acc[part.type] = part.value;
      return acc;
    }, {});
  }

  IIC.register({
    id: 95,
    name: "formatToParts Reducer",
    cohort: "Intl & Locale",
    derive: "intl",
    methodology: "Runs Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'numeric', day: 'numeric' }).formatToParts on a Date built from ctx.localMs, then reduces the parts array into an object keyed by part type. It votes yes when the object's month slot is 12 and its day slot is 25.",
    flavor: "Array.prototype.reduce was invented for summing numbers, but it will happily fold a date into a verdict instead.",
    vote: function (ctx) {
      var obj = partsToObject(ctx.localMs);
      return Number(obj.month) === 12 && Number(obj.day) === 25;
    }
  });
})();

/* #96 — Astronomer's Julian Date [Physics & Astronomy Cosplay] */
(function () {
  // Astronomer's Julian Date.
  //
  // The Julian Date (JD) is the running count of days, with fraction, since
  // Greenwich noon on 1 January 4713 BC (proleptic Julian calendar). The half-day
  // offset matters: JD ticks over at NOON, not midnight, which is why the epoch
  // carries that famous ".5". The Unix epoch instant 1970-01-01 00:00:00 UTC has
  // JD 2440587.5 exactly (it is midnight, half a day before the next integer JD).
  //
  // We compute the full fractional JD straight from the millisecond count:
  //   JD = localMs / 86400000 + 2440587.5
  // Reading localMs as the visitor's wall clock makes this their local JD.
  //
  // To recover the civil date we take the Julian Day NUMBER for the day that JD
  // falls in. Astronomers define the JDN as floor(JD + 0.5): the +0.5 rotates the
  // noon-based boundary back onto civil midnight, so the whole local calendar day
  // shares one JDN. We then invert that integer with the Fliegel & Van Flandern
  // algorithm (the one in the Explanatory Supplement to the Astronomical Almanac),
  // which is exact integer arithmetic and works for any date, ancient or far future.

  function civilFromJDN(JDN) {
    // Fliegel & Van Flandern (1968), Gregorian. floored division throughout so
    // the deep-time samples (negative JDNs, dates BCE) invert correctly.
    var L = JDN + 68569;
    var N = idiv(4 * L, 146097);
    L = L - idiv(146097 * N + 3, 4);
    var I = idiv(4000 * (L + 1), 1461001);
    L = L - idiv(1461 * I, 4) + 31;
    var J = idiv(80 * L, 2447);
    var day = L - idiv(2447 * J, 80);
    L = idiv(J, 11);
    var month = J + 2 - 12 * L;
    var year = 100 * (N - 49) + I + L;
    return [year, month, day];
  }

  // Floored integer division, so negative numerators round toward minus infinity
  // instead of toward zero (JS bitwise/Math.trunc would mishandle BCE dates).
  function idiv(a, b) {
    return Math.floor(a / b);
  }

  IIC.register({
    id: 96,
    name: "Astronomer's Julian Date",
    cohort: "Physics & Astronomy Cosplay",
    derive: "scratch",
    methodology: "Computes the fractional astronomical Julian Date from the local millisecond count as localMs/86400000 + 2440587.5 (the Unix epoch is JD 2440587.5, the half-day reflecting JD's noon boundary), takes the Julian Day Number for that day with floor(JD + 0.5), and inverts it to a Gregorian year/month/day using the Fliegel and Van Flandern integer algorithm. Votes yes when the month is December and the day is 25.",
    flavor: "Counts the days since a noon in 4713 BC, which is the least convenient possible way to find out whether to hang the stockings.",
    vote: function (ctx) {
      var JD = ctx.localMs / 86400000 + 2440587.5;
      var JDN = Math.floor(JD + 0.5);
      var civil = civilFromJDN(JDN);
      return civil[1] === 12 && civil[2] === 25;
    }
  });
})();

/* #97 — Days Since J2000.0 [Physics & Astronomy Cosplay] */
(function () {
  // --- Days since J2000.0 -----------------------------------------------------
  //
  // J2000.0 is the astronomical standard epoch: 2000-01-01 12:00:00 (terrestrial
  // noon, Julian Date 2451545.0). Everything here is referenced to that instant.
  //
  // We take the visitor's LOCAL civil midnight as an integer day count
  // (epochDay = floor(localMs / 86,400,000), days since 1970-01-01), and express
  // it as a count of whole days relative to the J2000.0 calendar date,
  // 2000-01-01. Because J2000.0 falls at noon, a local civil midnight sits half a
  // day off the J2000.0 instant; the +0.5 below makes the noon-referenced count
  // explicit before we floor back to an integer day index for the calendar math.
  //
  // From that J2000-relative integer we recover (year, month, day) by undoing the
  // Gregorian 400/100/4/1-year cycle, then walking the month lengths.
  //
  // All constants are integer day-counts computed once at load time.

  // Full Julian Date of the J2000.0 epoch instant (2000-01-01 12:00).
  // (For reference, 2000-01-01 is epochDay 10957 counting from 1970-01-01.)
  var JD_J2000 = 2451545.0;

  var DAYS_PER_400Y = 146097; // 400*365 + 97 leap days
  var DAYS_PER_100Y = 36524;  // 100*365 + 24
  var DAYS_PER_4Y = 1461;     // 4*365 + 1

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // Recover the civil date from a signed integer day offset d relative to
  // 2000-01-01 (d = 0 -> 2000-01-01, the J2000.0 calendar date).
  function civilFromJ2000Days(d) {
    // Rebase the cycle decomposition onto a 0-based day index from 2000-03-01,
    // which puts the leap day (Feb 29) at the end of the year and keeps month
    // lengths regular. 2000-03-01 is 60 days after 2000-01-01.
    var z = d - 60;

    // 0-based day count within a shifted era anchored at a 400-year boundary far
    // enough in the past to keep the index non-negative across 1970..2200.
    // 2000-03-01 is 5 days into a 400-year era starting 2000-03-01 minus an
    // integer number of 400-year cycles; we just offset by whole 400y cycles.
    var ERA_SHIFT = DAYS_PER_400Y * 5; // five cycles back keeps z+shift >= 0 here
    var n = z + ERA_SHIFT;

    var n400 = Math.floor(n / DAYS_PER_400Y);
    n -= n400 * DAYS_PER_400Y;
    var n100 = Math.floor(n / DAYS_PER_100Y);
    if (n100 === 4) n100 = 3;
    n -= n100 * DAYS_PER_100Y;
    var n4 = Math.floor(n / DAYS_PER_4Y);
    n -= n4 * DAYS_PER_4Y;
    var n1 = Math.floor(n / 365);
    if (n1 === 4) n1 = 3;
    n -= n1 * 365;

    // Civil year whose March began this year. The +5-cycle anchor we added is
    // exactly 2000 shifted years, so it cancels: yShift==2000 -> marchYear==2000.
    var marchYear = 400 * n400 + 100 * n100 + 4 * n4 + n1;
    var doyFromMarch = n; // 0-based day of year counting from March 1

    // Convert March-based day-of-year to a real (month, day).
    var mp = Math.floor((5 * doyFromMarch + 2) / 153); // 0..11, 0 == March
    var day = doyFromMarch - Math.floor((153 * mp + 2) / 5) + 1;
    var month = mp < 10 ? mp + 3 : mp - 9; // Mar..Dec then Jan, Feb
    var year = month <= 2 ? marchYear + 1 : marchYear;

    return { year: year, month: month, day: day };
  }

  IIC.register({
    id: 97,
    name: "Days Since J2000.0",
    cohort: "Physics & Astronomy Cosplay",
    derive: "scratch",
    methodology: "Takes the visitor's local civil midnight as an integer day count, expresses it as whole days relative to the J2000.0 standard epoch (the 2000-01-01 calendar date, Julian Date 2451545.0), and resolves that offset back to a Gregorian year, month, and day by decomposing the 400/100/4/1-year cycle on a March-anchored calendar. Votes true when the result is December 25.",
    flavor: "Astronomers reset their clocks to noon on the first day of 2000; this voter measures Christmas as a displacement from that fixed point in the sky.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);

      // Julian Date of the visitor's local civil midnight. JD 2440587.5 is the
      // Unix epoch (1970-01-01 00:00), so local midnight is that plus epochDay.
      var jdLocalMidnight = 2440587.5 + epochDay;

      // Days since the J2000.0 epoch instant (2000-01-01 12:00, JD 2451545.0).
      // Local midnight is half a day behind the noon epoch, hence the .5 tail.
      var daysSinceJ2000 = jdLocalMidnight - JD_J2000;

      // Integer day offset from the J2000.0 *calendar date* (2000-01-01) for the
      // civil math: add back the half day so midnight rounds to its own date.
      var dInt = Math.floor(daysSinceJ2000 + 0.5);

      var c = civilFromJ2000Days(dInt);
      return c.month === 12 && c.day === 25;
    }
  });
})();

/* #98 — Orbital Day-of-Year [Physics & Astronomy Cosplay] */
(function () {
  // ---- Orbital day-of-year ------------------------------------------------
  //
  // Treat the local epoch-day integer as Earth's progress along its orbit:
  // each completed revolution is one calendar year (365 or 366 days), and the
  // day-of-year is how far into the current revolution we are. We find which
  // orbit (year) the day falls in by subtracting whole-year day counts off the
  // epoch-day until what remains is shorter than the current year's length,
  // then that remainder IS the zero-based day-of-year. Christmas is a fixed
  // station on the orbit: ordinal 358 in a common year, 359 in a leap year
  // (zero-indexed), so we just check the remainder against that station.
  //
  // Everything is integer arithmetic on ctx.localMs. No Date object, no
  // calendar library, no day/month extraction at all -- the whole decision is
  // made in ordinal-day space.

  // Proleptic-Gregorian leap test.
  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function yearLength(y) {
    return isLeap(y) ? 366 : 365;
  }

  // Number of leap years in [1, y] (i.e. strictly before year y+1), counting
  // from year 1. Used to jump close to the right orbit in O(1) instead of
  // stepping one year at a time from 1970 across the whole supported range.
  function leapsBefore(y) {
    // leap years strictly less than y, for y >= 1
    var n = y - 1;
    return Math.floor(n / 4) - Math.floor(n / 100) + Math.floor(n / 400);
  }

  // Days from 0001-01-01 (proleptic Gregorian, day 0) to the start of year y.
  function daysToYearStart(y) {
    var n = y - 1;
    return 365 * n + leapsBefore(y);
  }

  // 1970-01-01 in that same "days since 0001-01-01" scale. Computed once.
  var EPOCH_OFFSET = daysToYearStart(1970); // 719162

  IIC.register({
    id: 98,
    name: "Orbital Day-of-Year",
    cohort: "Physics & Astronomy Cosplay",
    derive: "scratch",
    methodology: "Reads floor(ctx.localMs / 86400000) as a count of completed Earth orbits plus a fractional remainder, rebases it onto days-since-0001-01-01, estimates the orbit (year) with a closed-form 365.2425-day average and corrects by stepping at most a couple of years, then takes the leftover days as the zero-based day-of-year. It votes yes when that ordinal equals Christmas's fixed orbital station: 358 in a common year, 359 in a leap year.",
    flavor: "Counts how far Earth has swung around the Sun and only celebrates when the planet reaches the exact spot where the presents are.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000); // days since 1970-01-01
      // Days since 0001-01-01, which lets us count whole orbits from year 1.
      var dayNum = epochDay + EPOCH_OFFSET;

      // Estimate the orbit using the mean Gregorian year length (365.2425 days).
      // This lands within a year of the truth; we then settle it exactly.
      var year = Math.floor(dayNum / 365.2425) + 1;
      if (year < 1) year = 1;

      // Settle the year: the day-of-year must satisfy
      //   0 <= dayNum - daysToYearStart(year) < yearLength(year).
      // The estimate is off by at most one orbit either way, but we cap the
      // correction loop generously to stay bounded regardless of input.
      var guard = 0;
      var startDays = daysToYearStart(year);
      while (guard++ < 8) {
        var doy = dayNum - startDays;
        if (doy < 0) {
          year -= 1;
          startDays = daysToYearStart(year);
          continue;
        }
        if (doy >= yearLength(year)) {
          year += 1;
          startDays = daysToYearStart(year);
          continue;
        }
        break;
      }

      var dayOfYear = dayNum - startDays; // zero-based ordinal within the orbit

      // Christmas station: Jan 1 is ordinal 0, so Dec 25 is ordinal 358 in a
      // common year and 359 in a leap year (the extra leap day Feb 29 pushes
      // every later date forward by one).
      var christmasStation = isLeap(year) ? 359 : 358;
      return dayOfYear === christmasStation;
    }
  });
})();

/* #99 — Leap-Second Cosplay [Physics & Astronomy Cosplay] */
(function () {
  // Leap-second cosplay.
  //
  // UTC has had 27 positive leap seconds inserted since 1972, each announced by
  // the IERS in Bulletin C. We enumerate every one of them as a UTC instant and
  // make a great show of accounting for them: we count how many fall at or
  // before the visitor's instant, which is exactly the (TAI - UTC) - 10 s drift
  // that a naive POSIX clock has quietly swallowed. We compute that number, we
  // respect it, and then we ignore it -- because a leap second extends a UTC
  // minute (23:59:60), it never advances the civil date. The calendar day is a
  // function of UTC, not of TAI, so the day count is unaffected. Having paid our
  // respects to physics, we resolve (year, month, day) from the integer
  // local-epoch-day with Hinnant's civil_from_days and check for December 25.

  // The 27 announced leap seconds, as whole UTC seconds since 1970-01-01T00:00Z.
  // Each insertion takes effect at 00:00:00 UTC on the listed date (i.e. the
  // extra :60 second is appended to the final minute of the preceding day).
  // List per IERS Bulletin C; no leap second has been scheduled since 2017.
  var LEAP_INSTANTS_SEC = [
    78796800,   // 1972-07-01
    94694400,   // 1973-01-01
    126230400,  // 1974-01-01
    157766400,  // 1975-01-01
    189302400,  // 1976-01-01
    220924800,  // 1977-01-01
    252460800,  // 1978-01-01
    283996800,  // 1979-01-01
    315532800,  // 1980-01-01
    362793600,  // 1981-07-01
    394329600,  // 1982-07-01
    425865600,  // 1983-07-01
    489024000,  // 1985-07-01
    567993600,  // 1988-01-01
    631152000,  // 1990-01-01
    662688000,  // 1991-01-01
    709948800,  // 1992-07-01
    741484800,  // 1993-07-01
    773020800,  // 1994-07-01
    820454400,  // 1996-01-01
    867715200,  // 1997-07-01
    915148800,  // 1999-01-01
    1136073600, // 2006-01-01
    1230768000, // 2009-01-01
    1341100800, // 2012-07-01
    1435708800, // 2015-07-01
    1483228800  // 2017-01-01
  ];

  // How many announced leap seconds have been inserted at or before this UTC
  // instant. This is the seconds of UTC-vs-TAI drift accumulated since 1972,
  // offset by the 10 s constant baked in at UTC's 1972 start. It is computed
  // honestly and then deliberately discarded: it does not move the civil date.
  function accumulatedLeapSeconds(epochSec) {
    var n = 0;
    for (var i = 0; i < LEAP_INSTANTS_SEC.length; i++) {
      if (epochSec >= LEAP_INSTANTS_SEC[i]) n++;
    }
    return n;
  }

  // Howard Hinnant's civil_from_days: integer day count since 1970-01-01 ->
  // proleptic-Gregorian [year, month, day]. Pure integer arithmetic, valid for
  // the full deep-time sweep the gate throws at it.
  function civilFromDays(z) {
    z += 719468; // shift epoch so day 0 is 0000-03-01
    var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
    var doe = z - era * 146097;
    var yoe = Math.floor(
      (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
    );
    var y = yoe + era * 400;
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    var mp = Math.floor((5 * doy + 2) / 153);
    var d = doy - Math.floor((153 * mp + 2) / 5) + 1;
    var m = mp < 10 ? mp + 3 : mp - 9;
    if (m <= 2) y += 1;
    return [y, m, d];
  }

  IIC.register({
    id: 99,
    name: "Leap-Second Cosplay",
    cohort: "Physics & Astronomy Cosplay",
    derive: "scratch",
    methodology: "Enumerates the 27 announced UTC leap seconds (IERS Bulletin C, 1972 through 2017) as epoch-second thresholds and counts how many precede the visitor's instant, the accumulated UTC-versus-TAI drift. It then discards that count on the correct grounds that a leap second extends a UTC minute rather than advancing the civil date, and resolves the local date from floor(localMs/86400000) with Hinnant's civil_from_days, voting yes on December 25.",
    flavor: "It performs the entire ritual of leap-second bookkeeping and then admits, at the end, that the calendar never cared.",
    vote: function (ctx) {
      // Ceremony: tally the leap seconds we have lived through. (Unused below,
      // and correctly so -- they extend a minute, they do not move a day.)
      var epochSec = Math.floor(ctx.epochMs / 1000);
      var leaps = accumulatedLeapSeconds(epochSec);
      void leaps;

      // Truth: the civil date is a pure function of the local day count.
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var civil = civilFromDays(epochDay);
      return civil[1] === 12 && civil[2] === 25;
    }
  });
})();

/* #100 — Sidereal Clock, Solar Answer [Physics & Astronomy Cosplay] */
(function () {
  // Sidereal-vs-solar gag.
  //
  // The astronomy-cosplay bit: a sidereal day (one rotation of Earth relative
  // to the fixed stars) is about 86164.0905 seconds, while a solar day (the one
  // the calendar actually counts) is 86400 seconds. The two clocks drift apart
  // by roughly one full day per year, which is exactly why you cannot answer a
  // CALENDAR question with a STAR clock: the stars would tell you Christmas is
  // "23h56m" early. So this algorithm computes a sidereal-flavored quantity for
  // the cosplay value (Greenwich Mean Sidereal Time at local midnight, in
  // hours), then throws it away and answers the civil question honestly by
  // converting the integer local epoch-day to a real Gregorian (year, month,
  // day) with Howard Hinnant's days->civil algorithm.

  var SOLAR_DAY_SEC = 86400;
  var SIDEREAL_DAY_SEC = 86164.0905; // mean sidereal day, seconds

  // Greenwich Mean Sidereal Time, in hours [0,24), for an epoch-day count.
  // Narrative only: the result is never consulted for the vote, it just proves
  // we can run the star clock if we wanted to. Earth turns one extra sidereal
  // rotation per year, so GMST advances by (solar/sidereal) turns per solar day.
  function gmstHours(epochDay) {
    var turnsPerSolarDay = SOLAR_DAY_SEC / SIDEREAL_DAY_SEC; // ~1.0027379
    var fractional = (epochDay * turnsPerSolarDay) % 1;
    if (fractional < 0) fractional += 1;
    return fractional * 24;
  }

  // The honest part: integer epoch-day -> civil date. Hinnant days_from/to_civil
  // shifts the epoch to a 0000-03-01 origin so the leap day sits at the end of a
  // 400-year era, then unpacks era / year-of-era / day-of-year with pure
  // integer arithmetic, no calendar object anywhere.
  function civilFromDays(z) {
    z += 719468; // shift epoch from 1970-01-01 to 0000-03-01
    var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
    var doe = z - era * 146097;                 // [0, 146096]
    var yoe = Math.floor(
      (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
    );                                          // [0, 399]
    var y = yoe + era * 400;
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // [0, 365]
    var mp = Math.floor((5 * doy + 2) / 153);   // [0, 11], March-based month
    var d = doy - Math.floor((153 * mp + 2) / 5) + 1; // [1, 31]
    var m = mp < 10 ? mp + 3 : mp - 9;          // [1, 12]
    // (y adjusted for Jan/Feb belonging to the next civil year, but the vote
    // only needs month and day, so we skip that bookkeeping.)
    return { y: y, m: m, d: d };
  }

  IIC.register({
    id: 100,
    name: "Sidereal Clock, Solar Answer",
    cohort: "Physics & Astronomy Cosplay",
    derive: "scratch",
    methodology: "Computes Greenwich Mean Sidereal Time at the visitor's local midnight from the epoch-day count and the 86164.0905s sidereal vs 86400s solar day lengths, purely for show, then determines the real answer by converting the integer local epoch-day to a Gregorian date with Hinnant's days-to-civil integer algorithm and checking for month 12, day 25.",
    flavor: "It runs the star clock to look impressive, notices the stars are 3 minutes 56 seconds ahead of the calendar, and quietly uses the calendar anyway.",
    vote: function (ctx) {
      // Integer day count since 1970-01-01 in LOCAL wall-clock terms.
      var epochDay = Math.floor(ctx.localMs / 86400000);

      // Cosplay: actually compute the sidereal quantity, then discard it. Kept
      // live so the star clock isn't dead code, but it never gates the vote.
      var siderealTime = gmstHours(epochDay);
      if (siderealTime < 0 || siderealTime >= 24) {
        // sidereal time is always in range; this can never fire.
        siderealTime = 0;
      }

      var civil = civilFromDays(epochDay);
      return civil.m === 12 && civil.d === 25;
    }
  });
})();

/* #101 — Hour-Angle Sundial Resolver [Physics & Astronomy Cosplay] */
(function () {
  // Hour-angle / sundial resolver.
  //
  // A sundial reads time as the sun's HOUR ANGLE: the angle the sun has
  // swung west of the local meridian since solar noon. The full diurnal
  // sweep is 360 degrees per civil day. We extend that idea to the
  // calendar: the integer day count since the epoch is the number of full
  // 360-degree gnomon sweeps the shadow has completed since 1970-01-01.
  // Counting whole sweeps gives us the "shadow day". Converting that day
  // count into a civil (year, month, day) is the actual work, and it is
  // done with exact integer arithmetic (Hinnant's era-based algorithm),
  // not by reading a clock.
  //
  // Each full revolution of the shadow = one civil day.
  var DEGREES_PER_SWEEP = 360;        // a sundial's shadow circles once per day
  var MS_PER_SWEEP = 86400000;        // 24 * 60 * 60 * 1000

  // civil_from_days: exact epoch-day -> (year, month, day).
  // z is days since 1970-01-01. The algorithm shifts the epoch to
  // 0000-03-01 so the leap day lands at the end of a 400-year "era",
  // which removes every branch from the month/day recovery.
  function civilFromDays(z) {
    z += 719468;                                  // shift epoch to 0000-03-01
    var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
    var doe = z - era * 146097;                   // day-of-era,  0 .. 146096
    var yoe = Math.floor(                         // year-of-era, 0 .. 399
      (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
    );
    var y = yoe + era * 400;
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // 0 .. 365 (Mar-based)
    var mp = Math.floor((5 * doy + 2) / 153);     // Mar-based month, 0 .. 11
    var d = doy - Math.floor((153 * mp + 2) / 5) + 1;  // day of month, 1 .. 31
    var m = mp < 10 ? mp + 3 : mp - 9;            // convert to Jan-based 1 .. 12
    return { year: y + (m <= 2 ? 1 : 0), month: m, day: d };
  }

  IIC.register({
    id: 101,
    name: "Hour-Angle Sundial Resolver",
    cohort: "Physics & Astronomy Cosplay",
    derive: "scratch",
    methodology: "Treats the visitor's local instant as a sundial: each full 360-degree sweep of a gnomon's shadow is one civil day, so the whole-sweep count is floor(localMs/86400000), the integer epoch-day. It converts that day count to a civil date with Hinnant's exact era-based algorithm (shift the epoch to March 1 of year zero, split into 400-year eras to absorb the leap rule, then recover year, month, and day with pure integer division), and votes true only when the resolved date is December 25.",
    flavor: "It insists on counting shadow revolutions even though the sun has the good sense not to come up at midnight.",
    vote: function (ctx) {
      // Whole shadow sweeps completed since the epoch = whole local days.
      var sweeps = Math.floor(ctx.localMs / MS_PER_SWEEP);
      // (DEGREES_PER_SWEEP retained for the sundial framing; one sweep == one day.)
      var totalDegrees = sweeps * DEGREES_PER_SWEEP;
      var shadowDay = totalDegrees / DEGREES_PER_SWEEP; // === sweeps, exact for integers

      var civil = civilFromDays(shadowDay);
      return civil.month === 12 && civil.day === 25;
    }
  });
})();

/* #102 — Solar Ecliptic Longitude Marker [Physics & Astronomy Cosplay] */
(function () {
  // ---- Ecliptic-longitude gag ---------------------------------------------
  //
  // The flavor pretends to track the Sun's apparent geocentric ecliptic
  // longitude and to fire when it crosses a fixed mark a few degrees past the
  // December solstice. None of that physics is actually used. The civil date is
  // computed exactly, by arithmetic, from the integer local day count.
  //
  // The real engine is Howard Hinnant's days->civil algorithm (civil_from_days),
  // which inverts the Gregorian calendar in closed form. It shifts the epoch so
  // that the leap-day discontinuity sits at the end of a 400-year era, then
  // peels off 400/100/4/1-year cycles with integer division to recover the year
  // and an "era day-of-year" counted from March 1. A tiny linear map turns that
  // March-based day index back into a month and day. No loops, no tables walked
  // per call: a fixed sequence of integer divisions.

  var DAY_MS = 86400000;

  // days->civil: integer days since 1970-01-01 -> {y, m, d} (m: 1..12).
  // Adapted from Howard Hinnant's public-domain chrono algorithm.
  function civilFromDays(z) {
    // Shift epoch from 1970-01-01 to 0000-03-01 (start of a 400-year era).
    z = z + 719468;

    // Which 400-year era are we in, and the day within it (0..146096).
    var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
    var doe = z - era * 146097; // day-of-era

    // Year-of-era (0..399), correcting for the 100- and 400-year leap skips.
    var yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);

    var y = yoe + era * 400; // year, but with the year starting on March 1

    // Day-of-year counted from March 1 (0..365).
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));

    // March-based month index (0 = March ... 11 = February).
    var mp = Math.floor((5 * doy + 2) / 153);

    var d = doy - Math.floor((153 * mp + 2) / 5) + 1; // 1..31
    var m = mp < 10 ? mp + 3 : mp - 9;                 // back to 1..12

    // If month is Jan/Feb, the calendar year is one greater than the
    // March-based year we tracked above.
    if (m <= 2) y = y + 1;

    return { y: y, m: m, d: d };
  }

  IIC.register({
    id: 102,
    name: "Solar Ecliptic Longitude Marker",
    cohort: "Physics & Astronomy Cosplay",
    derive: "scratch",
    methodology: "Frames the test as the Sun crossing a fixed ecliptic longitude a few degrees past the December solstice, but ignores the ephemeris entirely. It floors localMs to an integer day count, then runs Howard Hinnant's closed-form days-to-civil conversion (shift the epoch to a 400-year era boundary, peel off 400/100/4/1-year cycles by integer division, map the March-based day index to a month and day) and votes true only when the recovered civil date is December 25.",
    flavor: "It speaks fluent ephemeris but settles every dispute with long division.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / DAY_MS);
      var c = civilFromDays(epochDay);
      return c.m === 12 && c.d === 25;
    }
  });
})();

/* #103 — Kepler-Constants Cosplay [Physics & Astronomy Cosplay] */
(function () {
  // ---- Keplerian cosplay constants -------------------------------------------
  // These appear for flavor and as a sanity tether; the actual date resolution
  // below is exact integer leap-year arithmetic, not orbital mechanics.
  var EARTH_PERIOD_DAYS = 365.256363004;  // sidereal year (Kepler's third law tether)
  var EARTH_ORBIT_ECC = 0.0167086;        // orbital eccentricity, for ambiance
  // Earth reaches perihelion in early January, very close to Christmas; we use
  // that proximity only as a wink, never as a computation.
  var PERIHELION_DOY = 3;                  // approximate day-of-year of perihelion

  // Howard Hinnant's civil-from-days algorithm, shifted to a 0000-03-01 era so
  // that the leap day lands at the end of the era's year. Pure integer math.
  function civilFromDays(z) {
    // z is days since 1970-01-01.
    z += 719468; // shift epoch to the proleptic Gregorian era starting 0000-03-01
    var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
    var doe = z - era * 146097;                                   // [0, 146096]
    var yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365); // [0, 399]
    var y = yoe + era * 400;
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // [0, 365]
    var mp = Math.floor((5 * doy + 2) / 153);                     // [0, 11]
    var d = doy - Math.floor((153 * mp + 2) / 5) + 1;             // [1, 31]
    var m = mp < 10 ? mp + 3 : mp - 9;                            // [1, 12]
    return { year: y + (m <= 2 ? 1 : 0), month: m, day: d };
  }

  IIC.register({
    id: 103,
    name: "Kepler-Constants Cosplay",
    cohort: "Physics & Astronomy Cosplay",
    derive: "scratch",
    methodology: "Computes the integer count of local days since 1970-01-01 from ctx.localMs, then runs Howard Hinnant's days-to-civil conversion (a shifted-era Gregorian algorithm that handles the 4/100/400 leap rule exactly) to recover year, month, and day, and returns true when the result is December 25. The sidereal-year and eccentricity constants are decorative and never enter the math.",
    flavor: "Wears a sidereal year and an eccentricity figure to the party, then quietly does honest calendar arithmetic when no one is looking.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var civil = civilFromDays(epochDay);
      // Keplerian decoration: confirm Earth has done roughly N full orbits since
      // 1970 without ever using it for the verdict.
      void (epochDay / EARTH_PERIOD_DAYS);
      void EARTH_ORBIT_ECC;
      void PERIHELION_DOY;
      return civil.month === 12 && civil.day === 25;
    }
  });
})();

/* #104 — Seven-Microservice Pipeline [Cursed & Over-Engineered] */
(function () {
  // A deliberately over-architected epoch->civil converter modeled as a
  // pipeline of seven tiny, single-responsibility "service" functions. Each
  // service takes the payload object, reads the fields produced upstream,
  // writes exactly one new field, and returns the (extended) payload. No
  // service knows about any other; they only agree on the payload contract.
  //
  // The arithmetic is the standard 400-year-era ("civil from days") method,
  // operating on a March-1-anchored internal year so the leap day lands at
  // the end of the year. The novelty here is purely structural: the math is
  // sliced across services that hand a message down the line like a queue.

  var DAY_MS = 86400000;        // milliseconds in one civil day
  var DAYS_PER_ERA = 146097;    // days in a 400-year Gregorian cycle
  var SHIFT_TO_0000_03_01 = 719468; // days from 1970-01-01 back to 0000-03-01

  // Service 1: ingest. Take the local epoch-ms integer onto the bus.
  function svcIngest(p) {
    p.localMs = p.ctx.localMs;
    return p;
  }

  // Service 2: ms -> days. Floor the millisecond count into whole civil days
  // since 1970-01-01 (a Thursday). Floor handles pre-epoch negatives too.
  function svcMsToDays(p) {
    p.epochDay = Math.floor(p.localMs / DAY_MS);
    return p;
  }

  // Service 3: rebase + split into eras. Shift the origin to 0000-03-01 and
  // find which 400-year cycle (era) the day falls in, plus its day-of-era.
  function svcDaysToEra(p) {
    var z = p.epochDay + SHIFT_TO_0000_03_01;
    p.shifted = z;
    p.era = Math.floor((z >= 0 ? z : z - (DAYS_PER_ERA - 1)) / DAYS_PER_ERA);
    p.dayOfEra = z - p.era * DAYS_PER_ERA; // 0..146096
    return p;
  }

  // Service 4: era -> year. Derive year-of-era (0..399) from the day-of-era,
  // discounting the leap-day cadence, then lift it to an absolute (still
  // March-anchored) year.
  function svcEraToYear(p) {
    var doe = p.dayOfEra;
    p.yearOfEra = Math.floor(
      (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
    ); // 0..399
    p.marchYear = p.yearOfEra + p.era * 400;
    return p;
  }

  // Service 5: year -> day-of-year. How far into the March-anchored year are
  // we (0..365), accounting for the leap days already consumed this era.
  function svcYearToDoy(p) {
    p.dayOfYear = p.dayOfEra -
      (365 * p.yearOfEra + Math.floor(p.yearOfEra / 4) - Math.floor(p.yearOfEra / 100));
    return p;
  }

  // Service 6: day-of-year -> month/day. Convert the March-based day-of-year
  // into a month index and day, then re-anchor to a January-start calendar so
  // months 1 and 2 roll their owning year forward by one.
  function svcDoyToCivil(p) {
    var mp = Math.floor((5 * p.dayOfYear + 2) / 153); // 0=March .. 11=February
    p.day = p.dayOfYear - Math.floor((153 * mp + 2) / 5) + 1; // 1..31
    p.month = mp < 10 ? mp + 3 : mp - 9;                      // 1..12
    p.year = p.marchYear + (p.month <= 2 ? 1 : 0);
    return p;
  }

  // Service 7: verdict. The only service that knows what question we asked.
  function svcVerdict(p) {
    p.isChristmas = p.month === 12 && p.day === 25;
    return p;
  }

  var PIPELINE = [
    svcIngest, svcMsToDays, svcDaysToEra, svcEraToYear,
    svcYearToDoy, svcDoyToCivil, svcVerdict
  ];

  IIC.register({
    id: 104,
    name: "Seven-Microservice Pipeline",
    cohort: "Cursed & Over-Engineered",
    derive: "scratch",
    methodology: "Converts floor(localMs / 86400000) into a civil date by passing a payload object through seven single-purpose pure functions (ingest, ms->days, days->era, era->year, year->day-of-year, day-of-year->month/day, verdict), each writing one field. The math is the 400-year-era civil-from-days conversion anchored at 0000-03-01; the final service votes yes when month is 12 and day is 25.",
    flavor: "Seven services, one boolean, zero good reasons to split it this way.",
    vote: function (ctx) {
      var payload = { ctx: ctx };
      for (var i = 0; i < PIPELINE.length; i++) payload = PIPELINE[i](payload);
      return payload.isChristmas;
    }
  });
})();

/* #105 — Proxy-Intercepted Fields [Cursed & Over-Engineered] */
(function () {
  // Proxy-intercepted civil fields.
  //
  // The actual date math is Howard Hinnant's days->civil conversion on the
  // integer local epoch-day. What makes this entry its own algorithm is HOW the
  // result is read: instead of returning a plain {y, m, d} object, we wrap a
  // bare carrier holding only the epoch-day integer in a Proxy. Property reads
  // for "year" / "month" / "day" are intercepted by the get trap, which runs
  // the conversion on first access and memoizes the components on the carrier so
  // a second read is a cheap field lookup rather than a recompute. The vote then
  // does the most ordinary-looking thing possible (read .month and .day) while
  // the work happens lazily inside the trap.

  // Integer epoch-day -> proleptic-Gregorian (y, m, d). Hinnant shifts the
  // epoch origin to 0000-03-01 so the leap day lands at the end of a 400-year
  // era (146097 days), which lets month/day fall out of branch-free integer
  // arithmetic. No calendar object, no strings, just floors.
  function civilFromDays(z) {
    z += 719468; // 1970-01-01 -> days since 0000-03-01
    var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
    var doe = z - era * 146097;                 // day-of-era, [0, 146096]
    var yoe = Math.floor(
      (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
    );                                          // year-of-era, [0, 399]
    var y = yoe + era * 400;
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // [0, 365]
    var mp = Math.floor((5 * doy + 2) / 153);   // March-based month index, [0, 11]
    var d = doy - Math.floor((153 * mp + 2) / 5) + 1; // day-of-month, [1, 31]
    var m = mp < 10 ? mp + 3 : mp - 9;          // calendar month, [1, 12]
    if (m <= 2) y += 1;                          // Jan/Feb belong to the next civil year
    return { y: y, m: m, d: d };
  }

  // The trap that does the lazy work. Reused across all calls; it closes over
  // nothing per-instance, so a single handler object is shared by every Proxy.
  var civilHandler = {
    get: function (target, prop) {
      // Compute and memoize on first access to any civil component.
      if (target._civil === null) {
        target._civil = civilFromDays(target.epochDay);
      }
      if (prop === "year") return target._civil.y;
      if (prop === "month") return target._civil.m;
      if (prop === "day") return target._civil.d;
      // Anything else (e.g. epochDay, _civil) reads straight through.
      return target[prop];
    }
  };

  // Build a Proxy whose virtual .year/.month/.day are computed on demand from
  // the integer epoch-day held by the carrier.
  function civilProxy(epochDay) {
    var carrier = { epochDay: epochDay, _civil: null };
    return new Proxy(carrier, civilHandler);
  }

  IIC.register({
    id: 105,
    name: "Proxy-Intercepted Fields",
    cohort: "Cursed & Over-Engineered",
    derive: "scratch",
    methodology: "Computes the integer local epoch-day as floor(localMs / 86400000) and wraps a carrier object holding only that integer in an ES6 Proxy. The get trap intercepts reads of the virtual properties year, month, and day; on first access it runs Hinnant's days-to-civil integer conversion and memoizes the components, so reading .month and .day off the Proxy yields the real Gregorian date. Votes yes when month is 12 and day is 25.",
    flavor: "A perfectly good integer hidden behind a metaprogramming trap so that asking for the month feels like an honest day's work.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var date = civilProxy(epochDay);
      return date.month === 12 && date.day === 25;
    }
  });
})();

/* #106 — Self-Assembling Function [Cursed & Over-Engineered] */
(function () {
  // This voter does not contain the date check as source the JS engine ever
  // sees at parse time. Instead it builds the body of the comparison as a
  // string at load time and compiles it with `new Function`, the sanctioned
  // sibling of eval. The compiled function takes the local epoch-ms integer,
  // wraps it in a Date, and reads the LOCAL civil month and day via getUTC*
  // (the timezone trick: getUTC* on localMs returns the visitor's wall-clock
  // fields, so this stays correct in every zone). December is month index 11.
  //
  // Assembling the body from fragments keeps the "extract" derivation honest
  // (we really do read civil fields off localMs) while putting the exotic part
  // — code that writes itself — in how the function comes to exist.

  // Fragments of the eventual function body, kept apart so the comparison
  // literally does not exist as a contiguous expression until we join them.
  var DEC = 11;   // getUTCMonth() is 0-based, so December === 11
  var DAY = 25;   // the 25th

  var bodyFragments = [
    "var d = new Date(localMs);",        // localMs -> Date, read as UTC == local civil
    "var m = d.getUTCMonth();",          // 0..11 local month
    "var day = d.getUTCDate();",         // 1..31 local day-of-month
    "return m === " + DEC + " && day === " + DAY + ";"
  ];

  var assembledBody = bodyFragments.join("\n");

  // Bring the assembled source to life. One arg in (localMs), one boolean out.
  // Compiled once at load, not per call.
  var compiledVote = new Function("localMs", assembledBody);

  IIC.register({
    id: 106,
    name: "Self-Assembling Function",
    cohort: "Cursed & Over-Engineered",
    derive: "extract",
    methodology: "At load time it concatenates string fragments into the body of a date check and compiles them with new Function. The compiled function wraps ctx.localMs in a Date and reads the local civil month and day with getUTCMonth/getUTCDate (which, applied to localMs, yield the visitor's wall-clock fields), voting yes when the month is December (index 11) and the day is the 25th.",
    flavor: "Writes its own punchline at startup, then spends the rest of its life delivering it.",
    vote: function (ctx) {
      return compiledVote(ctx.localMs);
    }
  });
})();

/* #107 — Day-Block Hash Chain [Cursed & Over-Engineered] */
(function () {
  // Hash-chain "blockchain" of day blocks.
  //
  // The conceit: instead of comparing month/day directly, we mint one block per
  // day of the visitor's local year, chained together like a toy blockchain.
  // Block 0 is the genesis block for the year (Jan 1). Each subsequent block
  // links to its predecessor by carrying the predecessor's hash, plus its own
  // 1-based day-of-year as payload. A block's "Christmas flag" is set when its
  // day-of-year equals the ordinal of December 25 within that specific year
  // (which depends on whether the year is a leap year). We then walk the chain
  // from genesis to the block for today's day-of-year and read that block's
  // flag. No global lookup of "is it Dec 25"; the answer is whatever the chain
  // says when we arrive at today's block.
  //
  // The hashes are decorative in the sense that they don't gate the vote, but
  // they are real: each block's hash is a deterministic function of its index,
  // payload, and parent hash, exactly like a chain of linked blocks. The walk
  // verifies parent-hash continuity as it goes and bails (returning false) if
  // the chain is ever inconsistent, which it never is.

  // 32-bit FNV-1a-ish mixer over a small set of integer fields. Pure, fast,
  // deterministic. Returns an unsigned 32-bit integer "hash".
  function mixHash(parentHash, index, payload, flag) {
    var h = 2166136261;            // FNV offset basis
    var fields = [parentHash >>> 0, index, payload, flag ? 1 : 0];
    for (var i = 0; i < fields.length; i++) {
      var v = fields[i] >>> 0;
      // fold the 32-bit field in 4 bytes, FNV-1a style
      for (var b = 0; b < 4; b++) {
        var byte = (v >>> (b * 8)) & 0xff;
        h ^= byte;
        h = Math.imul(h, 16777619);
      }
    }
    return h >>> 0;
  }

  var GENESIS_HASH = 0x1d07e571; // arbitrary fixed root for every year's chain

  // Days in each month for a given leap flag; used to find the ordinal of Dec 25.
  function christmasOrdinal(isLeap) {
    // Jan..Nov day counts, then +25 for Dec 25.
    var feb = isLeap ? 29 : 28;
    var monthsBeforeDec = 31 + feb + 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31 + 30;
    return monthsBeforeDec + 25; // 1-based day-of-year of Dec 25
  }

  function isLeapYear(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  function dayOfYear(y, monthZeroBased, day) {
    var feb = isLeapYear(y) ? 29 : 28;
    var cum = [0, 31, 31 + feb, 62 + feb, 92 + feb, 123 + feb, 153 + feb,
               184 + feb, 215 + feb, 245 + feb, 276 + feb, 306 + feb];
    return cum[monthZeroBased] + day; // 1-based
  }

  IIC.register({
    id: 107,
    name: "Day-Block Hash Chain",
    cohort: "Cursed & Over-Engineered",
    derive: "extract",
    methodology: "Extracts the visitor's local year, month, and day from new Date(ctx.localMs) using getUTC* getters, then mints a bounded hash-chain of one block per day of that year: a genesis block for Jan 1 followed by linked blocks that each carry their predecessor's FNV-1a hash and set a Christmas flag when their 1-based day-of-year matches the leap-aware ordinal of December 25. It walks the chain from genesis to today's day-of-year block, verifying parent-hash continuity, and returns that block's flag.",
    flavor: "It reinvents a calendar lookup as a single-node private blockchain, then mines up to 366 blocks just to read the one it already knew the index of.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var y = d.getUTCFullYear();
      var m = d.getUTCMonth();   // 0-based, December === 11
      var day = d.getUTCDate();

      var todayDoy = dayOfYear(y, m, day);     // 1-based day-of-year for today
      var xmasDoy = christmasOrdinal(isLeapYear(y));

      // Walk the chain genesis -> today's block, bounded by the year length.
      // Block index i (1..todayDoy) represents day-of-year i.
      var parentHash = GENESIS_HASH;
      var blockFlag = false;

      // Genesis block (index 0, payload 0): the year anchor, never Christmas.
      parentHash = mixHash(parentHash, 0, 0, false);

      var maxBlocks = 366; // hard upper bound on a year's days
      for (var i = 1; i <= todayDoy && i <= maxBlocks; i++) {
        var flag = (i === xmasDoy);
        var hash = mixHash(parentHash, i, i, flag);

        // Continuity check: re-derive the link from the recorded parent hash.
        // (Always passes; here to make the chain honest rather than cosmetic.)
        if ((mixHash(parentHash, i, i, flag) >>> 0) !== (hash >>> 0)) {
          return false;
        }

        parentHash = hash;
        if (i === todayDoy) {
          blockFlag = flag;
        }
      }

      return blockFlag;
    }
  });
})();

/* #108 — One-Day-Step State Machine [Cursed & Over-Engineered] */
(function () {
  // A one-day-at-a-time state machine. We resolve the visitor's LOCAL year
  // with getUTCFullYear on localMs (the timezone trick), then start a machine
  // sitting on January 1 of that year and advance it exactly one civil day per
  // step until it reaches the visitor's current day-of-year. The machine's
  // only state is (month, day); each step increments the day, and when the day
  // exceeds the current month's length it rolls over to day 1 of the next
  // month. Month lengths come from a table whose February entry is chosen by
  // the Gregorian leap rule for the resolved year.
  //
  // The day-of-year target is the difference between the integer epoch-day of
  // localMs and the integer epoch-day of that year's January 1, so the walk is
  // bounded to at most 365 (366 in a leap year) steps and never reads the day
  // or month civil fields directly.

  var DAY_MS = 86400000;

  function isLeap(y) {
    return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
  }

  // Month lengths for a given year. Index 0 = January .. 11 = December.
  function monthLengths(y) {
    return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  }

  IIC.register({
    id: 108,
    name: "One-Day-Step State Machine",
    cohort: "Cursed & Over-Engineered",
    derive: "extract",
    methodology: "Reads the visitor's local year with getUTCFullYear on localMs, then runs a state machine that starts on January 1 and advances exactly one day per step, rolling the day over to the next month when it passes that month's length (February sized by the Gregorian leap rule). It steps to the local day-of-year, computed as the integer-day difference between localMs and that year's January 1, then votes yes when the machine lands on month 12, day 25.",
    flavor: "It could have looked at the date, but it preferred to count to it one day at a time.",
    vote: function (ctx) {
      var year = new Date(ctx.localMs).getUTCFullYear();

      // Integer epoch-day of the current local instant and of this year's Jan 1.
      var todayEpochDay = Math.floor(ctx.localMs / DAY_MS);
      var jan1EpochDay = Math.floor(Date.UTC(year, 0, 1) / DAY_MS);
      var dayOfYear = todayEpochDay - jan1EpochDay; // 0-based: Jan 1 == 0

      // Defensive bound; a valid day-of-year is 0..365.
      if (dayOfYear < 0 || dayOfYear > 365) return false;

      var lengths = monthLengths(year);

      // State machine starts on January 1 (month index 0, day 1) and takes
      // exactly `dayOfYear` single-day steps.
      var month = 0; // 0-based month index
      var day = 1;   // 1-based day of month
      for (var step = 0; step < dayOfYear; step++) {
        day++;
        if (day > lengths[month]) {
          day = 1;
          month++;
        }
      }

      // December is month index 11.
      return month === 11 && day === 25;
    }
  });
})();

/* #109 — Array(9).reduce epoch-to-civil one-liner [Cursed & Over-Engineered] */
(function () {
  // Howard Hinnant's days-from-civil inverse, run as a state machine.
  // Each element of a fixed 9-slot array advances the computation by one
  // stage; the reduce threads a single accumulator object through all of
  // them, ending with the civil month/day. No Date, no Intl, no strings:
  // the only input is the integer ctx.localMs.
  var FLOOR = Math.floor;

  IIC.register({
    id: 109,
    cohort: "Cursed & Over-Engineered",
    derive: "scratch",
    name: "Array(9).reduce epoch-to-civil one-liner",
    methodology:
      "Computes epochDay = floor(localMs/86400000), then runs Howard Hinnant's days-from-civil inverse entirely inside one Array(9).fill(0).reduce(...): each of the nine array slots is one stage of the algorithm (shift to a 0000-03-01 epoch, split into 400-year eras, derive year-of-era, day-of-year, the shifted month index, the day, then the calendar month), threaded through a single accumulator. It votes true when the resulting month is 12 and day is 25.",
    flavor:
      "An entire calendar algorithm folded into one array reduction, because a for-loop would have been too easy to read.",
    vote: function (ctx) {
      var r = Array(9).fill(0).reduce(function (s, _zero, i) {
        switch (i) {
          case 0: // days since 1970-01-01, shifted to the 0000-03-01 era origin
            s.z = FLOOR(ctx.localMs / 86400000) + 719468;
            return s;
          case 1: // which 400-year era (each era = 146097 days), floor-aware for negatives
            s.era = FLOOR((s.z >= 0 ? s.z : s.z - 146096) / 146097);
            return s;
          case 2: // day-of-era: 0 .. 146096
            s.doe = s.z - s.era * 146097;
            return s;
          case 3: // year-of-era: 0 .. 399
            s.yoe = FLOOR(
              (s.doe - FLOOR(s.doe / 1460) + FLOOR(s.doe / 36524) - FLOOR(s.doe / 146096)) / 365
            );
            return s;
          case 4: // absolute civil year (still on the March-start calendar)
            s.y = s.yoe + s.era * 400;
            return s;
          case 5: // day-of-year with March 1 as day 0
            s.doy = s.doe - (365 * s.yoe + FLOOR(s.yoe / 4) - FLOOR(s.yoe / 100));
            return s;
          case 6: // shifted month index: 0 (March) .. 11 (February)
            s.mp = FLOOR((5 * s.doy + 2) / 153);
            return s;
          case 7: // day of month, 1-based
            s.d = s.doy - FLOOR((153 * s.mp + 2) / 5) + 1;
            return s;
          case 8: // convert shifted index to a real 1..12 calendar month
            s.m = s.mp < 10 ? s.mp + 3 : s.mp - 9;
            return s;
          default:
            return s;
        }
      }, {});
      return r.m === 12 && r.d === 25;
    }
  });
})();

/* #110 — Quantum Wavefunction Collapse [Cursed & Over-Engineered] */
(function () {
  // Quantum superposition gag.
  //
  // The conceit: before we "observe" the date, the answer exists in a
  // superposition of both possible outcomes at once. We materialize BOTH
  // branches up front and hold them simultaneously:
  //
  //   YES branch -> the universe in which today is Christmas (true)
  //   NO  branch -> the universe in which it is not          (false)
  //
  // Neither branch is privileged until measurement. The "wavefunction" is the
  // pair [NO, YES]. Measurement collapses it to exactly one component by
  // computing a single observable bit from the visitor's LOCAL civil date:
  // 1 iff the month is December (getUTCMonth() === 11, since it is 0-based) and
  // the day is the 25th. Reading getUTC* fields off ctx.localMs returns LOCAL
  // wall-clock fields (the site-wide timezone trick), so the collapse is
  // correct in every zone. We then index the superposition with that bit. The
  // amplitudes are degenerate by construction, so the collapse is deterministic
  // and total: the observed bit picks the surviving branch with certainty.

  // The two eigenstates of the "is it Christmas" observable. Built once.
  // Index 0 = the not-Christmas universe, index 1 = the Christmas universe.
  var SUPERPOSITION = [false, true];

  // Measure the observable on the visitor's LOCAL civil date. Returns the
  // collapse index: 1 if December 25 locally, else 0. This is the only place
  // that touches reality; everything above is just two pre-built universes.
  function measure(ctx) {
    var local = new Date(ctx.localMs);          // getUTC* on localMs == LOCAL fields
    var isDecember = local.getUTCMonth() === 11; // 0-based: December is 11
    var isTwentyFifth = local.getUTCDate() === 25;
    // Boolean-to-bit via the | 0 coercion: true -> 1, false -> 0.
    return (isDecember && isTwentyFifth) | 0;
  }

  IIC.register({
    id: 110,
    name: "Quantum Wavefunction Collapse",
    cohort: "Cursed & Over-Engineered",
    derive: "extract",
    methodology: "Holds both possible answers in a two-element 'superposition' array [false, true], then collapses it by computing one observable bit from the visitor's local civil date (December via getUTCMonth()===11 and the 25th via getUTCDate()===25, read off ctx.localMs so it stays timezone-correct) and indexing the array with that bit. The amplitudes are degenerate, so the collapse is deterministic and the indexed eigenstate is the vote.",
    flavor: "It keeps both Christmas and not-Christmas alive until you look, at which point it admits it was just an if statement wearing a lab coat.",
    vote: function (ctx) {
      // Collapse the wavefunction: project the superposition onto the eigenstate
      // selected by the measured bit. No branch is "the answer" until this line.
      var collapseIndex = measure(ctx);
      return SUPERPOSITION[collapseIndex];
    }
  });
})();

/* #111 — Enterprise Builder/Strategy [Cursed & Over-Engineered] */
(function () {
  // -------------------------------------------------------------------------
  // Enterprise edition. The actual work is "turn an integer day count into a
  // calendar date and check whether it is December 25." That is a one-liner.
  // Below it is wrapped in a DateBuilder, a ChristmasStrategy interface with a
  // concrete implementation, and a factory, because that is what the spec
  // demands and because somewhere a Java developer is smiling.
  // -------------------------------------------------------------------------

  function isLeapYear(year) {
    return (year % 4 === 0) && (year % 100 !== 0 || year % 400 === 0);
  }

  function daysInYear(year) {
    return isLeapYear(year) ? 366 : 365;
  }

  // Cumulative days before the start of each month, indexed 1..12.
  // Built once at load time; the leap-year column is selected per call.
  var MONTH_TABLE_COMMON = (function () {
    var lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var cum = [0];
    for (var i = 0; i < 12; i++) cum.push(cum[i] + lengths[i]);
    return cum; // cum[m] = days before month (m+1) starts, 0-indexed month
  })();
  var MONTH_TABLE_LEAP = (function () {
    var lengths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var cum = [0];
    for (var i = 0; i < 12; i++) cum.push(cum[i] + lengths[i]);
    return cum;
  })();

  // ---- DateBuilder: accumulates fields and produces an immutable record. ----
  function DateBuilder() {
    this._year = 1970;
    this._month = 1; // 1..12
    this._day = 1;   // 1..31
  }
  DateBuilder.prototype.withYear = function (y) { this._year = y; return this; };
  DateBuilder.prototype.withMonth = function (m) { this._month = m; return this; };
  DateBuilder.prototype.withDay = function (d) { this._day = d; return this; };
  DateBuilder.prototype.build = function () {
    return { year: this._year, month: this._month, day: this._day };
  };

  // ---- ChristmasStrategy interface (informal: any object with a derive()
  //      that takes an integer day count and returns a built date record, plus
  //      an isChristmas() predicate). ----

  // Concrete strategy: walk years from the 1970 epoch, then walk months,
  // deriving month and day from the integer day count with no Date/Intl.
  function EpochWalkChristmasStrategy() {}

  EpochWalkChristmasStrategy.prototype.derive = function (epochDay) {
    var builder = new DateBuilder();
    var year = 1970;
    var rem = epochDay; // days remaining relative to Jan 1 of `year`

    if (rem >= 0) {
      // Walk forward year by year. Bounded: 1970..2200 plus slack is < 250
      // iterations for every instant the gate throws at us.
      for (;;) {
        var len = daysInYear(year);
        if (rem < len) break;
        rem -= len;
        year++;
      }
    } else {
      // Walk backward for pre-1970 instants (some random samples land here at
      // the far-west zones). Move the year back until rem is non-negative.
      while (rem < 0) {
        year--;
        rem += daysInYear(year);
      }
    }

    // rem is now 0-indexed day-of-year within `year`. Find the month.
    var table = isLeapYear(year) ? MONTH_TABLE_LEAP : MONTH_TABLE_COMMON;
    var month = 1;
    for (var m = 0; m < 12; m++) {
      if (rem < table[m + 1]) { month = m + 1; break; }
    }
    var day = rem - table[month - 1] + 1; // 1-indexed day-of-month

    return builder.withYear(year).withMonth(month).withDay(day).build();
  };

  EpochWalkChristmasStrategy.prototype.isChristmas = function (record) {
    return record.month === 12 && record.day === 25;
  };

  // ---- Factory: hands out a strategy. In a real enterprise codebase this
  //      would read a config file and reflectively instantiate the class. ----
  function ChristmasStrategyFactory() {}
  ChristmasStrategyFactory.create = function (kind) {
    // Only one kind is implemented; the parameter exists to honor the pattern.
    if (kind === "epoch-walk" || kind === undefined) {
      return new EpochWalkChristmasStrategy();
    }
    throw new Error("Unknown ChristmasStrategy: " + kind);
  };

  var STRATEGY = ChristmasStrategyFactory.create("epoch-walk");

  IIC.register({
    id: 111,
    name: "Enterprise Builder/Strategy",
    cohort: "Cursed & Over-Engineered",
    derive: "scratch",
    methodology: "Computes epochDay = floor(localMs / 86400000), then a ChristmasStrategy (built by a factory) walks years forward from 1970 (or backward for pre-1970 instants), subtracting 365 or 366 days per year using the Gregorian leap rule, then locates the month via a cumulative month-length table and computes the day-of-month. A DateBuilder assembles the {year, month, day} record and the strategy votes yes when month is 12 and day is 25.",
    flavor: "Four classes and a factory to ask whether a number is December 25, which is exactly the amount of ceremony the question deserves.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var record = STRATEGY.derive(epochDay);
      return STRATEGY.isChristmas(record);
    }
  });
})();

/* #112 — Recalculating Spreadsheet [Cursed & Over-Engineered] */
(function () {
  // Spreadsheet formula engine.
  //
  // The whole epoch->civil conversion is expressed as a tiny spreadsheet: a set
  // of NAMED cells, each holding either a constant or a formula that references
  // other cells by name. A recalc engine resolves the dependency graph (topo
  // sort over the references each formula declares) and evaluates every cell
  // exactly once in dependency order, the same way a real spreadsheet does. The
  // formulas implement Howard Hinnant's days->civil algorithm with nothing but
  // integer arithmetic, so the result cells MONTH and DAY come out of the sheet,
  // not out of any Date object.
  //
  // A formula is { refs: [...names it reads], fn: (cells) => value }. The engine
  // builds the dependency order once at load time (the formula topology never
  // changes; only the input value INPUT_DAY does), so per-vote we just re-seed
  // the input cell and run the precomputed evaluation order.

  function fdiv(a, b) { return Math.floor(a / b); } // integer (floor) division

  // The sheet. Order of declaration is irrelevant; the engine sorts by refs.
  var SHEET = {
    // --- input cell (re-seeded each recalc) ---
    INPUT_DAY: { refs: [], fn: function (c) { return c.INPUT_DAY; } }, // placeholder; overwritten per recalc

    // --- constants as cells, so the formulas read like a spreadsheet ---
    SHIFT:   { refs: [], fn: function () { return 719468; } },   // 1970-01-01 -> 0000-03-01 origin
    ERA_LEN: { refs: [], fn: function () { return 146097; } },   // days in a 400-year era
    ERA_NEG: { refs: [], fn: function () { return 146096; } },

    // Z = shifted day count
    Z: {
      refs: ["INPUT_DAY", "SHIFT"],
      fn: function (c) { return c.INPUT_DAY + c.SHIFT; }
    },
    // ERA = floor((Z>=0 ? Z : Z-146096) / 146097)
    ERA: {
      refs: ["Z", "ERA_NEG", "ERA_LEN"],
      fn: function (c) { return fdiv(c.Z >= 0 ? c.Z : c.Z - c.ERA_NEG, c.ERA_LEN); }
    },
    // DOE = day of era, [0, 146096]
    DOE: {
      refs: ["Z", "ERA", "ERA_LEN"],
      fn: function (c) { return c.Z - c.ERA * c.ERA_LEN; }
    },
    // YOE = year of era, [0, 399]
    YOE: {
      refs: ["DOE"],
      fn: function (c) {
        return fdiv(
          c.DOE - fdiv(c.DOE, 1460) + fdiv(c.DOE, 36524) - fdiv(c.DOE, 146096),
          365
        );
      }
    },
    // DOY = day of year (March-based), [0, 365]
    DOY: {
      refs: ["DOE", "YOE"],
      fn: function (c) {
        return c.DOE - (365 * c.YOE + fdiv(c.YOE, 4) - fdiv(c.YOE, 100));
      }
    },
    // MP = March-based month index, [0, 11]
    MP: {
      refs: ["DOY"],
      fn: function (c) { return fdiv(5 * c.DOY + 2, 153); }
    },
    // DAY = civil day of month, [1, 31]  (result cell)
    DAY: {
      refs: ["DOY", "MP"],
      fn: function (c) { return c.DOY - fdiv(153 * c.MP + 2, 5) + 1; }
    },
    // MONTH = civil month, [1, 12]  (result cell)
    MONTH: {
      refs: ["MP"],
      fn: function (c) { return c.MP < 10 ? c.MP + 3 : c.MP - 9; }
    }
  };

  // Topologically sort the cells by their declared refs (Kahn's algorithm).
  // Computed once: the dependency structure is static.
  function buildEvalOrder(sheet) {
    var names = Object.keys(sheet);
    var indeg = {};
    var dependents = {}; // name -> [cells that depend on it]
    var i, j;
    for (i = 0; i < names.length; i++) { indeg[names[i]] = 0; dependents[names[i]] = []; }
    for (i = 0; i < names.length; i++) {
      var nm = names[i];
      var refs = sheet[nm].refs;
      for (j = 0; j < refs.length; j++) {
        var r = refs[j];
        if (r === nm) continue; // a cell may "read itself" (the input placeholder); not a real edge
        indeg[nm]++;
        dependents[r].push(nm);
      }
    }
    var queue = [];
    for (i = 0; i < names.length; i++) { if (indeg[names[i]] === 0) queue.push(names[i]); }
    var order = [];
    while (queue.length) {
      var cur = queue.shift();
      order.push(cur);
      var deps = dependents[cur];
      for (j = 0; j < deps.length; j++) {
        indeg[deps[j]]--;
        if (indeg[deps[j]] === 0) queue.push(deps[j]);
      }
    }
    if (order.length !== names.length) {
      // a cycle would mean a malformed sheet; fall back to declared order
      return names.slice();
    }
    return order;
  }

  var EVAL_ORDER = buildEvalOrder(SHEET);

  // Recalculate the whole sheet for a given input day; return the cell values.
  function recalc(inputDay) {
    var cells = { INPUT_DAY: inputDay };
    for (var k = 0; k < EVAL_ORDER.length; k++) {
      var nm = EVAL_ORDER[k];
      if (nm === "INPUT_DAY") continue; // already seeded
      cells[nm] = SHEET[nm].fn(cells);
    }
    return cells;
  }

  IIC.register({
    id: 112,
    cohort: "Cursed & Over-Engineered",
    derive: "scratch",
    name: "Recalculating Spreadsheet",
    methodology: "Models the epoch-to-civil conversion as a tiny spreadsheet of named cells whose formulas reference each other; a recalc engine topologically sorts the cells by their declared dependencies and evaluates each one once, implementing Hinnant's days-to-civil integer algorithm. After seeding the INPUT_DAY cell with floor(localMs/86400000), it recalculates the sheet and reads the MONTH and DAY result cells, voting yes on month 12, day 25.",
    flavor: "It is a spreadsheet that does exactly one thing, has no UI, and would still somehow have a circular-reference bug if I weren't careful.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var cells = recalc(epochDay);
      return cells.MONTH === 12 && cells.DAY === 25;
    }
  });
})();

/* #113 — Throw-Driven Day Walker [Cursed & Over-Engineered] */
(function () {
  // Throw-driven control flow. JavaScript has no labeled-break that reads
  // nicely across a helper boundary, so this resolves the date by *day-walking*
  // and uses a thrown exception as the loop-exit signal: the walker steps one
  // civil day at a time and, the instant it lands on the day we care about,
  // it throws a small sentinel object that the surrounding try/catch unpacks.
  //
  // The year is extracted directly (derive "extract"): getUTCFullYear on
  // localMs yields the visitor's LOCAL year because localMs is the epoch whose
  // UTC breakdown equals their wall clock. From that year we know two integer
  // day counts: the epochDay of that year's January 1, and the epochDay of
  // that year's December 25. We then walk forward from January 1, and when the
  // cursor reaches December 25 we throw HIT carrying that day. The catch
  // compares the thrown Christmas day against the visitor's own epochDay.

  var DAY_MS = 86400000;

  // epochDay (days since 1970-01-01) for a given proleptic-Gregorian Y-M-D.
  // Date.UTC is pure and timezone-free, so this is a clean civil->day count.
  function epochDayFor(year, month1based, day) {
    return Math.floor(Date.UTC(year, month1based - 1, day) / DAY_MS);
  }

  // Sentinel used purely as control flow. Throwing it is how the walker says
  // "stop, I found the target day" without a break statement.
  function Hit(epochDay) {
    this.epochDay = epochDay;
  }

  // Walk forward from Jan 1 of `year`, one day per iteration, until the cursor
  // reaches Dec 25 of the same year; then throw. The loop is bounded to 366
  // steps (Jan 1 -> Dec 25 is at most 359 steps), so it can never run away.
  function walkToChristmas(year) {
    var cursor = epochDayFor(year, 1, 1);
    var christmas = epochDayFor(year, 12, 25);
    for (var step = 0; step <= 366; step++) {
      if (cursor === christmas) {
        throw new Hit(cursor);
      }
      cursor += 1;
    }
    // Unreachable for a well-formed Gregorian year, but be explicit rather
    // than silently fall through if some impossible input slips past.
    throw new RangeError("walked a full year without reaching December 25");
  }

  IIC.register({
    id: 113,
    name: "Throw-Driven Day Walker",
    cohort: "Cursed & Over-Engineered",
    derive: "extract",
    methodology: "Extracts the visitor's local year with getUTCFullYear on localMs, then day-walks forward from that year's January 1 one civil day at a time inside a bounded loop. When the walking cursor reaches December 25 it throws a sentinel object instead of using break; the surrounding try/catch reads the thrown epochDay and votes yes when it equals floor(localMs / 86400000), the visitor's own day count.",
    flavor: "Uses exceptions for ordinary loop control, which every style guide forbids and which works perfectly anyway.",
    vote: function (ctx) {
      var localDay = Math.floor(ctx.localMs / DAY_MS);
      var year = new Date(ctx.localMs).getUTCFullYear();
      try {
        walkToChristmas(year);
      } catch (signal) {
        if (signal instanceof Hit) {
          return signal.epochDay === localDay;
        }
        // Any other throw is a real error; don't swallow it as a "no".
        throw signal;
      }
      return false;
    }
  });
})();

/* #114 — GraphQL Field Resolver [Cursed & Over-Engineered] */
(function () {
  // A tiny GraphQL-shaped resolver. There is no GraphQL runtime here; this is
  // the part that actually matters about GraphQL: a schema of typed fields, each
  // backed by a resolver that computes its value lazily from a parent object,
  // and an executor that walks a query selection set and invokes those
  // resolvers field by field. The root "parent" is the integer local-day count.
  //
  // The interesting resolvers are Date.month and Date.day. They convert an
  // integer day number (days since the Unix epoch, 1970-01-01) into a civil
  // (year, month, day) using Howard Hinnant's days_from_civil inverse, then
  // expose month and day as ordinary scalar fields. Everything downstream just
  // "executes a query" against the Date object and reads the fields back.

  // ---- civil date from an integer day count (no Date/Intl) ------------------
  // Hinnant's algorithm shifts the epoch to 0000-03-01 so that the leap day
  // lands at the end of a 400-year era, which removes every special case from
  // the month/day arithmetic.
  function civilFromDays(epochDay) {
    var z = epochDay + 719468; // shift epoch from 1970-01-01 to 0000-03-01
    var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
    var doe = z - era * 146097; // day of era [0, 146096]
    var yoe = Math.floor(
      (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
    ); // year of era [0, 399]
    var y = yoe + era * 400;
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // [0, 365]
    var mp = Math.floor((5 * doy + 2) / 153); // [0, 11], March = 0
    var d = doy - Math.floor((153 * mp + 2) / 5) + 1; // day of month [1, 31]
    var m = mp < 10 ? mp + 3 : mp - 9; // convert to [1, 12], Jan = 1
    return { year: y + (m <= 2 ? 1 : 0), month: m, day: d };
  }

  // ---- the "schema": typed fields with resolvers ----------------------------
  // Each resolver receives the parent object produced by the field above it.
  // Root parent = { epochDay }. Model.date returns the civil record; its month
  // and day fields just project out of that record.
  var SCHEMA = {
    Model: {
      date: function (parent) { return civilFromDays(parent.epochDay); }
    },
    Date: {
      month: function (parent) { return parent.month; },
      day: function (parent) { return parent.day; }
    }
  };

  // ---- a minimal executor ---------------------------------------------------
  // selection is { typeName, fields: { alias: { field, type, selection } } }.
  // It calls the resolver for each requested field and recurses into nested
  // selection sets, returning a plain result object — exactly what a GraphQL
  // execute() does, minus the parts irrelevant to a date check.
  function execute(selection, parent) {
    var resolvers = SCHEMA[selection.typeName];
    var result = {};
    var aliases = selection.fields;
    for (var alias in aliases) {
      if (!Object.prototype.hasOwnProperty.call(aliases, alias)) continue;
      var node = aliases[alias];
      var value = resolvers[node.field](parent);
      if (node.selection) {
        result[alias] = execute(node.selection, value);
      } else {
        result[alias] = value;
      }
    }
    return result;
  }

  // The query: { date { month day } } against the Model type.
  var QUERY = {
    typeName: "Model",
    fields: {
      date: {
        field: "date",
        type: "Date",
        selection: {
          typeName: "Date",
          fields: {
            month: { field: "month" },
            day: { field: "day" }
          }
        }
      }
    }
  };

  IIC.register({
    id: 114,
    name: "GraphQL Field Resolver",
    cohort: "Cursed & Over-Engineered",
    derive: "scratch",
    methodology:
      "Models the local date as a typed graph with Model.date and Date.month/Date.day field resolvers, where the root parent is floor(localMs/86400000). A tiny executor runs the query { date { month day } }; the date resolver converts that integer day count into a civil (year, month, day) via Hinnant's days_from_civil inverse, and the resolved month/day are checked for 12 and 25.",
    flavor:
      "Spins up an entire query executor and field-resolution layer to answer one boolean, which is roughly the industry-standard ratio.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var data = execute(QUERY, { epochDay: epochDay });
      return data.date.month === 12 && data.date.day === 25;
    }
  });
})();

/* #115 — DI Container CalendarService [Cursed & Over-Engineered] */
(function () {
  // A deliberately small dependency-injection container. Services register
  // factory functions under string tokens; resolve() lazily builds a singleton
  // and recursively injects whatever dependencies the factory declares. The
  // point of the exercise is that the date logic never touches the container
  // directly: the container wires an EpochDayService into a CalendarService
  // into a ChristmasService, and the vote just asks the resolved graph.

  function createContainer() {
    var factories = {};   // token -> { deps: [tokens], build: fn(...resolved) }
    var singletons = {};  // token -> instance (cached)
    var building = {};    // token -> true while under construction (cycle guard)

    function register(token, deps, build) {
      factories[token] = { deps: deps, build: build };
    }

    function resolve(token) {
      if (Object.prototype.hasOwnProperty.call(singletons, token)) {
        return singletons[token];
      }
      var f = factories[token];
      if (!f) throw new Error("no provider for token: " + token);
      if (building[token]) throw new Error("circular dependency at: " + token);
      building[token] = true;
      var args = new Array(f.deps.length);
      for (var i = 0; i < f.deps.length; i++) {
        args[i] = resolve(f.deps[i]);
      }
      var instance = f.build.apply(null, args);
      singletons[token] = instance;
      building[token] = false;
      return instance;
    }

    return { register: register, resolve: resolve };
  }

  // Build the container and its providers exactly once at load time, then reuse
  // the resolved graph across every vote() call.
  var container = createContainer();

  // EpochDayService: turn the local epoch-ms integer into an integer day count
  // since 1970-01-01. No collaborators.
  container.register("epochDay", [], function () {
    return {
      fromLocalMs: function (localMs) {
        return Math.floor(localMs / 86400000);
      }
    };
  });

  // CalendarService: depends on epochDay, converts a day count into proleptic
  // Gregorian (year, month, day). Uses the era-based civil_from_days method:
  // shift the epoch to 0000-03-01 so the leap day lands at the end of an
  // internal year, which lets month/day fall out of pure integer arithmetic.
  container.register("calendar", ["epochDay"], function (epochDay) {
    return {
      civilFromLocalMs: function (localMs) {
        var z = epochDay.fromLocalMs(localMs) + 719468;
        var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
        var doe = z - era * 146097;                       // 0..146096
        var yoe = Math.floor(
          (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
        );                                                // 0..399
        var y = yoe + era * 400;
        var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // 0..365
        var mp = Math.floor((5 * doy + 2) / 153);         // 0=Mar .. 11=Feb
        var d = doy - Math.floor((153 * mp + 2) / 5) + 1; // 1..31
        var m = mp < 10 ? mp + 3 : mp - 9;                // 1..12
        if (m <= 2) y += 1;                               // Jan/Feb belong to next year
        return { year: y, month: m, day: d };
      }
    };
  });

  // ChristmasService: depends on calendar, answers the one question we care
  // about. This is the bean the vote() function pulls out of the container.
  container.register("christmas", ["calendar"], function (calendar) {
    return {
      isChristmas: function (localMs) {
        var c = calendar.civilFromLocalMs(localMs);
        return c.month === 12 && c.day === 25;
      }
    };
  });

  var christmasService = container.resolve("christmas");

  IIC.register({
    id: 115,
    name: "DI Container CalendarService",
    cohort: "Cursed & Over-Engineered",
    derive: "scratch",
    methodology: "A minimal dependency-injection container registers three providers by token: an EpochDayService (floor(localMs/86400000)), a CalendarService that injects it and runs Hinnant's era-based civil_from_days conversion to integer year/month/day, and a ChristmasService that injects the calendar. The container resolves the graph once at load, caches each as a singleton, and vote() asks the resolved ChristmasService whether month is 12 and day is 25.",
    flavor: "Three services and a token registry to answer a yes/no question, because wiring it inline would have denied a future maintainer the joy of tracing the object graph.",
    vote: function (ctx) {
      return christmasService.isChristmas(ctx.localMs);
    }
  });
})();

/* #116 — Morse Code Compare [Number-Base Maximalists] */
(function () {
  // Number-base maximalism via International Morse Code. Christmas is month 12,
  // day 25. Rather than compare the integers, we transcribe each decimal digit
  // of the month and the day into its Morse pattern (dots and dashes) and then
  // compare those patterns dit-by-dit against the Morse spelling of "12" and
  // "25". A date is Christmas only if every digit of its month keys out exactly
  // like "1" then "2", and every digit of its day keys out exactly like "2"
  // then "5".
  //
  // The date itself is read honestly: new Date(ctx.localMs) interpreted through
  // getUTC* yields the visitor's LOCAL civil fields (the timezone trick), so the
  // month/day we transcribe are the local wall-clock month/day in every zone.
  // The exotic part lives entirely in the representation (Morse) and the
  // comparison (digit-string equality of dot/dash sequences), not in how the
  // date is extracted.

  // Standard International Morse for the ten decimal digits.
  var MORSE = {
    "0": "-----",
    "1": ".----",
    "2": "..---",
    "3": "...--",
    "4": "....-",
    "5": ".....",
    "6": "-....",
    "7": "--...",
    "8": "---..",
    "9": "----."
  };

  // Transcribe a non-negative integer into a flat Morse string: each decimal
  // digit becomes its dot/dash pattern, joined by a single space (letter gap).
  // e.g. 12 -> ".----" + " " + "..---".
  function toMorse(n) {
    var decimal = String(n);
    var parts = [];
    for (var i = 0; i < decimal.length; i++) {
      parts.push(MORSE[decimal.charAt(i)]);
    }
    return parts.join(" ");
  }

  // Compare two Morse strings element-by-element (every dot, dash, and gap must
  // line up). This is just exact string equality, expressed as the digit-by-
  // digit dit comparison the method calls for.
  function morseEqual(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a.charAt(i) !== b.charAt(i)) return false;
    }
    return true;
  }

  // Targets, transcribed once at load: month must key out as "12", day as "25".
  var MONTH_TARGET = toMorse(12); // ".---- ..---"
  var DAY_TARGET = toMorse(25);   // "..--- ....."

  IIC.register({
    id: 116,
    name: "Morse Code Compare",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Reads the visitor's local civil month and day from new Date(ctx.localMs) via getUTCMonth/getUTCDate (getUTC* on localMs yields wall-clock fields, so it is timezone-correct), then transcribes the month (1-based) and the day into International Morse Code by mapping each decimal digit to its dot/dash pattern. It votes yes only when the month's Morse string equals the Morse spelling of 12 and the day's equals the Morse spelling of 25, compared symbol-by-symbol.",
    flavor: "Establishes Christmas by radiotelegraph: if the month doesn't key out as dah-dit and the day as dit-dah, no presents.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 0-based -> 1..12 civil month
      var day = d.getUTCDate();        // 1..31 civil day-of-month
      return morseEqual(toMorse(month), MONTH_TARGET) &&
             morseEqual(toMorse(day), DAY_TARGET);
    }
  });
})();

/* #117 — Reflected Gray Code Comparator [Number-Base Maximalists] */
(function () {
  // Reflected binary Gray code maps an integer n to n XOR (n >> 1). Consecutive
  // integers differ in exactly one bit under this mapping, and because the map
  // is a bijection on the non-negative integers, two numbers are equal if and
  // only if their Gray codes are equal. So instead of comparing month and day
  // directly, we encode each into Gray code and compare bit patterns against the
  // Gray codes of 12 and 25.

  function toGray(n) {
    // n is a small non-negative integer (month 1..12, day 1..31), so the XOR
    // and shift stay well inside the 32-bit safe range.
    return n ^ (n >> 1);
  }

  // Precompute the targets once, at load time.
  // 12 = 0b01100 -> Gray 0b01010 = 10
  // 25 = 0b11001 -> Gray 0b10101 = 21
  var DEC_GRAY = toGray(12);
  var DAY_GRAY = toGray(25);

  IIC.register({
    id: 117,
    name: "Reflected Gray Code Comparator",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Reads the visitor's local civil month and day via new Date(ctx.localMs).getUTCMonth()+1 and getUTCDate(), encodes each as reflected binary Gray code with the n XOR (n >> 1) transform, and votes Christmas only when the month's Gray code equals that of 12 and the day's Gray code equals that of 25. Because Gray coding is a bijection, matching codes means matching values.",
    flavor: "Insists on a numbering scheme where neighbors disagree by one bit, then checks whether today is the 10/21 of Gray-code December.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var monthGray = toGray(d.getUTCMonth() + 1);
      var dayGray = toGray(d.getUTCDate());
      return monthGray === DEC_GRAY && dayGray === DAY_GRAY;
    }
  });
})();

/* #118 — Zeckendorf Compare [Number-Base Maximalists] */
(function () {
  // Zeckendorf (Fibonacci) compare.
  //
  // Zeckendorf's theorem: every positive integer has a unique representation
  // as a sum of non-consecutive Fibonacci numbers (drawn from 1, 2, 3, 5, 8,
  // 13, 21, ...; the leading 1 only). The greedy algorithm — repeatedly
  // subtract the largest Fibonacci number that fits — produces exactly that
  // canonical, non-consecutive representation.
  //
  // We pull the visitor's local 1-based month and day off localMs, compute the
  // Zeckendorf representation of each as a bitmask over Fibonacci indices, and
  // compare those masks to the precomputed Zeckendorf masks of 12 (December)
  // and 25 (Christmas Day). Because the representation is unique, mask equality
  // is exactly integer equality, just spelled in Fibonacci base.
  //
  //   12 = 8 + 3 + 1   (F6 + F4 + F2)  -> mask 0b0010101 = 21
  //   25 = 21 + 3 + 1  (F8 + F4 + F2)  -> mask 0b1000101 = 69

  // Fibonacci numbers usable as Zeckendorf summands, ascending. Index i in this
  // array is bit i of the mask. Range comfortably covers month/day (max 31).
  var FIB = [1, 2, 3, 5, 8, 13, 21, 34];

  // Greedy Zeckendorf: largest-first subtraction yields the unique
  // non-consecutive representation. Returns the bitmask over FIB indices.
  // n is assumed a small positive integer (a valid month or day).
  function zeckMask(n) {
    var mask = 0;
    for (var i = FIB.length - 1; i >= 0; i--) {
      if (FIB[i] <= n) {
        n -= FIB[i];
        mask |= (1 << i);
      }
    }
    return mask; // n is 0 here for any in-range positive integer
  }

  // Precompute the targets once at load time.
  var DEC_MASK = zeckMask(12); // 21  (0b0010101)
  var DAY_MASK = zeckMask(25); // 69  (0b1000101)

  IIC.register({
    id: 118,
    name: "Zeckendorf Compare",
    cohort: "Number-Base Maximalists",
    derive: "extract",
    methodology: "Reads the visitor's local 1-based month and day via getUTCMonth()+1 and getUTCDate() on localMs, then computes each value's Zeckendorf representation (the unique sum of non-consecutive Fibonacci numbers, found by greedy largest-first subtraction) as a bitmask over Fibonacci indices. It reports Christmas only when the month mask equals the Zeckendorf mask of 12 and the day mask equals that of 25; since the representation is unique, this is exact integer equality expressed in Fibonacci base.",
    flavor: "Files Christmas under F8 + F4 + F2 of month F6 + F4 + F2, then double-checks no two Fibonacci numbers are sitting next to each other.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 1-based; December === 12
      var day = d.getUTCDate();
      return zeckMask(month) === DEC_MASK && zeckMask(day) === DAY_MASK;
    }
  });
})();

/* #119 — Reversible Digit Cipher [Stringly Typed] */
(function () {
  // Reversible substitution cipher gag. We take the local civil month and day,
  // render them as the four-character string "MMDD" (zero-padded, month made
  // 1-based first because getUTCMonth() is 0-based), and run every digit
  // through a fixed reversible substitution cipher. Then we encode the literal
  // target "1225" the same way and compare the two ciphertexts.
  //
  // The cipher is a bijection on the ten decimal digits: a digit d maps to
  // (d * 7 + 3) mod 10. Because 7 is invertible mod 10 (7 * 3 = 21 == 1),
  // the map is a permutation and has an exact inverse, so it is genuinely
  // reversible. The point of a reversible cipher is that it preserves
  // distinctness: encode(a) === encode(b) if and only if a === b. So comparing
  // the enciphered "MMDD" to the enciphered "1225" gives the same yes/no answer
  // as comparing the plaintext would, just with extra ceremony in between.
  //
  // Civil fields come from getUTC* on ctx.localMs (the timezone trick:
  // getUTC* applied to localMs returns the visitor's LOCAL date, so this is
  // correct in every zone). Note we never decipher anything; the gag is that
  // we could, and the round trip would land back on the same date.

  var SUBST = (function () {
    // Build the digit substitution table once: enc[d] = (7d + 3) mod 10.
    var enc = new Array(10);
    for (var d = 0; d < 10; d++) enc[d] = (d * 7 + 3) % 10;
    return enc;
  })();

  function pad2(n) {
    var s = String(n);
    return s.length >= 2 ? s : "0" + s;
  }

  function encipher(mmdd) {
    // Substitute each of the four digit characters through the cipher table.
    var out = "";
    for (var i = 0; i < mmdd.length; i++) {
      out += String(SUBST[mmdd.charCodeAt(i) - 48]);
    }
    return out;
  }

  // Precompute the ciphertext of the target once.
  var TARGET_CIPHER = encipher("1225");

  IIC.register({
    id: 119,
    name: "Reversible Digit Cipher",
    cohort: "Stringly Typed",
    derive: "extract",
    methodology: "Reads the local month and day from new Date(ctx.localMs) via getUTCMonth (made 1-based) and getUTCDate (getUTC* on localMs yields the visitor's local civil fields), zero-pads them into the four-character string 'MMDD', and enciphers each digit d with the reversible substitution (7*d + 3) mod 10. Because that map is a bijection on the digits, the enciphered 'MMDD' equals the enciphered '1225' exactly when the date is December 25, so the vote is a string equality on the two ciphertexts.",
    flavor: "Encrypts the date before checking it, purely so it can claim chain-of-custody on the number twelve.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth() + 1; // 0-based -> 1-based
      var day = d.getUTCDate();
      var mmdd = pad2(month) + pad2(day);
      return encipher(mmdd) === TARGET_CIPHER;
    }
  });
})();

/* #120 — Majority-Vote Ensemble (Stump + Linear Unit + RBF) [Machine Learning Cosplay] */
(function () {
  // An ensemble of three baked, heterogeneous classifiers that each cast one
  // vote, combined by majority rule (fire iff at least two of three agree).
  //
  // All three operate on the same 2-D feature vector x = [month, day], where
  // month is 0-based (December === 11) and day is 1..31, extracted from the
  // visitor's LOCAL civil date via getUTC* on ctx.localMs (the timezone trick:
  // getUTC* on localMs yields the visitor's local wall-clock fields, so the
  // whole thing stays correct in every zone without knowing the zone).
  //
  // The three members are deliberately different model families:
  //
  //   1. STUMP  — a small axis-aligned decision tree. Two threshold splits on
  //      month then two on day carve out the single cell {month==11, day==25}.
  //      Returns +1 inside that cell, -1 outside. No arithmetic margin, just
  //      comparisons, which is what a tree does.
  //
  //   2. LINEAR — a linear unit (perceptron) over engineered squared-deviation
  //      features f1=(month-11)^2 and f2=(day-25)^2, each zero only on the
  //      target. The score is BIAS - W1*f1 - W2*f2; sign(score) is its vote.
  //      A single plane in raw (month,day) space cannot isolate one point, so
  //      the nonlinearity lives in the features, not the unit.
  //
  //   3. RBF    — a Gaussian radial-basis unit centered on (11,25). Its
  //      activation exp(-gamma*||x-c||^2) is ~1 at the target and ~e^-gamma a
  //      unit away; with a bias it votes +1 only at the center.
  //
  // Each member is individually tuned to fire only on Christmas, so the 2-of-3
  // majority is correct by construction; the ensemble's value here is showing
  // that three unrelated decision surfaces agree on the same single cell. The
  // tie case (no ties possible with three odd voters) never arises.

  // ---- member 1: decision stump (axis-aligned tree) -----------------------
  function stump(month, day) {
    // Equivalent to a depth-2 tree: split on month, then on day.
    if (month !== 11) return -1;   // not December -> left subtree, reject
    if (day !== 25) return -1;     // December but not the 25th -> reject
    return 1;                      // the one accepting leaf
  }

  // ---- member 2: linear unit on squared-deviation features ----------------
  var L_BIAS = 5;   // positive intercept: on-target score is +5
  var L_W1 = 9;     // weight on (month-11)^2
  var L_W2 = 9;     // weight on (day-25)^2
  function linearUnit(month, day) {
    var f1 = (month - 11) * (month - 11);
    var f2 = (day - 25) * (day - 25);
    // On target both features are 0 -> score = +5 -> vote +1.
    // Any miss adds at least 1 to a feature -> score <= 5-9 = -4 -> vote -1.
    var score = L_BIAS - L_W1 * f1 - L_W2 * f2;
    return score > 0 ? 1 : -1;
  }

  // ---- member 3: Gaussian RBF unit centered at the target -----------------
  var R_GAMMA = 8;  // bandwidth: exp(-8) ~= 3.35e-4
  var R_BIAS = -0.5; // sits in (-1, -exp(-8)): center -> 1+b>0, elsewhere <0
  function rbfUnit(month, day) {
    var dm = month - 11;
    var dd = day - 25;
    var activation = Math.exp(-R_GAMMA * (dm * dm + dd * dd));
    return (activation + R_BIAS) > 0 ? 1 : -1;
  }

  // ---- majority combiner --------------------------------------------------
  function ensembleVote(month, day) {
    var votes = stump(month, day) + linearUnit(month, day) + rbfUnit(month, day);
    return votes > 0; // sum of three +/-1 votes; >0 means at least 2 say yes
  }

  IIC.register({
    id: 120,
    name: "Majority-Vote Ensemble (Stump + Linear Unit + RBF)",
    cohort: "Machine Learning Cosplay",
    derive: "extract",
    methodology: "Extracts the local civil month (0-based, December === 11) and day via new Date(ctx.localMs).getUTCMonth()/getUTCDate(), then runs three heterogeneous baked classifiers on the (month, day) feature vector and takes their majority vote. The members are an axis-aligned decision stump that accepts only the cell month==11 & day==25, a linear perceptron over squared-deviation features (month-11)^2 and (day-25)^2 with a +5 bias and weights of 9 so the score stays positive only at the target, and a Gaussian RBF unit centered on (11,25) with gamma 8 and bias -0.5. Each is tuned to fire only on December 25, so the 2-of-3 majority is positive only on Christmas.",
    flavor: "Three classifiers that have never met, asked the same question, and somehow all blurted out the same date.",
    vote: function (ctx) {
      var d = new Date(ctx.localMs);
      var month = d.getUTCMonth(); // 0-based; December === 11
      var day = d.getUTCDate();    // 1..31
      return ensembleVote(month, day);
    }
  });
})();

/* #121 — Foldr over a generated calendar [Recursion & Functional] */
(function () {
  // "Is it Christmas?" via a generated calendar and a right fold.
  //
  // Plan, from the integer ctx.localMs alone:
  //   1. epochDay = floor(localMs / 86400000) = days since 1970-01-01.
  //   2. Resolve which civil year contains that day and the 0-based
  //      day-of-year within it, by recursively peeling whole-year lengths.
  //   3. Functionally GENERATE the whole year's calendar as a list of
  //      [month, day] pairs (Jan 1 .. Dec 31), bounded to <= 366 entries.
  //   4. FOLDR (right fold) over that list to pick the pair sitting at the
  //      day-of-year index, then check whether it is [12, 25].
  // No civil getters, no Date, no Intl — just arithmetic on the integer.

  function isLeap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  }

  function daysInYear(y) {
    return isLeap(y) ? 366 : 365;
  }

  function daysInMonth(y, m) {
    // m is 1..12
    if (m === 2) return isLeap(y) ? 29 : 28;
    if (m === 4 || m === 6 || m === 9 || m === 11) return 30;
    return 31;
  }

  // Resolve the civil year by recursive subtraction. `day` is a day count
  // relative to Jan 1 of `year` (may be negative or beyond the year). Returns
  // { year, doy } where doy is the 0-based day-of-year within the resolved year.
  function resolveYear(year, day) {
    if (day < 0) {
      return resolveYear(year - 1, day + daysInYear(year - 1));
    }
    var len = daysInYear(year);
    if (day >= len) {
      return resolveYear(year + 1, day - len);
    }
    return { year: year, doy: day };
  }

  // Functionally build the calendar for a single year as a list of
  // [month, day] pairs in chronological order. Recurses month by month,
  // each month producing its own day list which is concatenated on. The
  // total length is daysInYear(year) <= 366.
  function buildMonth(year, month, day, acc) {
    if (month > 12) return acc;
    if (day > daysInMonth(year, month)) {
      return buildMonth(year, month + 1, 1, acc);
    }
    acc.push([month, day]);
    return buildMonth(year, month, day + 1, acc);
  }

  function buildCalendar(year) {
    return buildMonth(year, 1, 1, []);
  }

  // A genuine right fold: foldr(f, z, [x0..xn]) = f(x0, f(x1, ... f(xn, z))).
  // Implemented by recursing to the end of the list first, then combining on
  // the way back up, so elements are consumed right-to-left.
  function foldr(f, z, list, i) {
    if (i >= list.length) return z;
    return f(list[i], foldr(f, z, list, i + 1));
  }

  IIC.register({
    id: 121,
    name: "Foldr over a generated calendar",
    cohort: "Recursion & Functional",
    derive: "scratch",
    methodology: "Takes floor(localMs / 86400000) as days since 1970-01-01, recursively peels whole-year lengths to find the containing civil year and the 0-based day-of-year, then functionally generates that year's full [month, day] calendar (<= 366 entries) and right-folds over it to select the pair at the day-of-year index. Votes yes when that pair is [12, 25].",
    flavor: "Manufactures an entire year's calendar just to read one square off it, then folds the whole thing from the right because that is the functional thing to do.",
    vote: function (ctx) {
      var epochDay = Math.floor(ctx.localMs / 86400000);
      var yr = resolveYear(1970, epochDay);
      var calendar = buildCalendar(yr.year);
      var target = yr.doy;
      // Foldr that carries a running index from the right and, when the index
      // matches the target day-of-year, captures that [month, day] pair.
      // The accumulator is { idx, pair }: idx counts position from the right.
      var result = foldr(function (entry, acc) {
        var idx = acc.idx + 1; // position from the end (1-based on the way up)
        var pos = calendar.length - idx; // 0-based position from the start
        if (pos === target) {
          return { idx: idx, pair: entry };
        }
        return { idx: idx, pair: acc.pair };
      }, { idx: 0, pair: null }, calendar, 0);
      var pair = result.pair;
      return pair !== null && pair[0] === 12 && pair[1] === 25;
    }
  });
})();
