<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>Laporan Equity — {{ $team['name'] }}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'DejaVu Sans', sans-serif;
  font-size: 8px;
  color: #1A1916;
  background: #fff;
  padding: 28px 30px 24px;
}

.header { margin-bottom: 14px; }
.header .title { font-size: 14px; font-weight: bold; color: #1A1916; }
.header .sub  { font-size: 8px; color: #9A9890; margin-top: 2px; }
.header .meta { font-size: 7px; color: #9A9890; text-align: right; }
.header-rule { border: none; border-top: 2px solid #E07820; margin: 8px 0 14px; }

/* ── SECTION ── */
.section-title {
  font-size: 9px; font-weight: bold; color: #E07820;
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 8px; border-bottom: 1px solid #ECEAE4; padding-bottom: 3px;
}

.two-col { width: 100%; border-collapse: collapse; }
.two-col td { vertical-align: top; }

/* ── TABLE ── */
table.data {
  width: 100%; border-collapse: collapse; font-size: 7.5px;
}
table.data th {
  background: #1A1916; color: #F0EDE6; padding: 4px 6px; text-align: left; font-size: 7px; font-weight: bold;
}
table.data td {
  padding: 3px 6px; border-bottom: 1px solid #ECEAE4;
}
table.data tbody tr:nth-child(even) { background: #F9F8F6; }
table.data tbody tr:nth-child(odd)  { background: #fff; }
.text-right { text-align: right; }

/* EQUITY BAR */
.bar-wrap { background: #ECEAE4; height: 5px; width: 100%; border-radius: 1px; }
.bar-fill { height: 5px; border-radius: 1px; background: #E07820; }

.footer {
  position: fixed; bottom: 12px; left: 30px; right: 30px;
  border-top: 1px solid #ECEAE4; padding-top: 3px;
  font-size: 6.5px; color: #9A9890;
}
</style>
</head>
<body>

<div class="footer">
  SEIRIS · {{ $team['name'] }} · {{ $generated_at }}
</div>

<table class="header" width="100%">
  <tr>
    <td>
      <div class="title">{{ $team['name'] }}</div>
      <div class="sub">Laporan Equity & Distribusi Slicing Pie</div>
    </td>
    <td class="meta" width="200">
      Dibuat: {{ $generated_at }}<br>
      @if($snapshot['is_frozen']) ⛔ FROZEN @else ✅ AKTIF @endif
      &middot; Total Slices: {{ number_format($snapshot['total_slices']) }}
    </td>
  </tr>
</table>
<hr class="header-rule">

{{-- ═══ CHART ROW: PIE + BAR ═══ --}}
<table class="two-col">
<tr>
  {{-- PIE CHART --}}
  <td width="38%" style="padding-right: 14px;">
    <div class="section-title">Distribusi Equity</div>
    @php
      $colors = ['#E07820','#1D4ED8','#166534','#7E22CE','#9F1239','#92400E','#0891B2'];
      $cx = 90; $cy = 90; $r = 80;
      $total = $snapshot['total_slices'];
      $startAngle = -90;
      $paths = [];
      foreach ($snapshot['equity_map'] as $i => $m) {
        $pct = $total > 0 ? ($m['slices'] / $total) : 0;
        $sweep = $pct * 360;
        $endAngle = $startAngle + $sweep;
        $x1 = $cx + $r * cos(deg2rad($startAngle));
        $y1 = $cy + $r * sin(deg2rad($startAngle));
        $x2 = $cx + $r * cos(deg2rad($endAngle));
        $y2 = $cy + $r * sin(deg2rad($endAngle));
        $largeArc = $sweep > 180 ? 1 : 0;
        $color = $colors[$i % count($colors)];
        $midAngle = $startAngle + $sweep / 2;
        $lx = $cx + ($r * 0.65) * cos(deg2rad($midAngle));
        $ly = $cy + ($r * 0.65) * sin(deg2rad($midAngle));
        $paths[] = compact('x1','y1','x2','y2','largeArc','color','lx','ly','pct','sweep');
        $startAngle = $endAngle;
      }
    @endphp
    <svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" width="150" height="150">
      @foreach($snapshot['equity_map'] as $i => $m)
      @php $p = $paths[$i]; @endphp
      @if(abs($p['sweep'] - 360) < 0.01)
        <circle cx="{{ $cx }}" cy="{{ $cy }}" r="{{ $r }}" fill="{{ $p['color'] }}"/>
      @else
        <path d="M {{ $cx }} {{ $cy }} L {{ number_format($p['x1'],4) }} {{ number_format($p['y1'],4) }} A {{ $r }} {{ $r }} 0 {{ $p['largeArc'] }} 1 {{ number_format($p['x2'],4) }} {{ number_format($p['y2'],4) }} Z"
              fill="{{ $p['color'] }}" stroke="#fff" stroke-width="1.5"/>
      @endif
      @if($p['pct'] > 0.06)
        <text x="{{ number_format($p['lx'],2) }}" y="{{ number_format($p['ly'],2) }}"
              text-anchor="middle" dominant-baseline="middle"
              font-family="DejaVu Sans" font-size="8" font-weight="bold" fill="#fff">
          {{ number_format($m['equity_pct'], 1) }}%
        </text>
      @endif
      @endforeach
    </svg>
    {{-- Legend ringkas --}}
    <table style="width:100%; border-collapse:collapse; margin-top: 4px;">
      @foreach($snapshot['equity_map'] as $i => $m)
      <tr>
        <td style="width:8px; padding: 1px 0;"><div style="width:6px; height:6px; background:{{ $colors[$i % count($colors)] }};"></div></td>
        <td style="padding: 1px 3px; font-size: 7px;">{{ $m['name'] }}</td>
        <td style="text-align:right; font-size: 7px; font-weight:bold; color:#E07820;">{{ number_format($m['equity_pct'], 1) }}%</td>
      </tr>
      @endforeach
    </table>
  </td>

  {{-- BAR CHART (horizontal) --}}
  <td width="62%">
    <div class="section-title">Slices Per Anggota</div>
    @php $maxSlices = max(array_column($snapshot['equity_map'], 'slices')); @endphp
    <table style="width:100%; border-collapse:collapse;">
      @foreach($snapshot['equity_map'] as $m)
      <tr>
        <td style="width:70px; padding: 2px 4px; font-size: 7px; white-space:nowrap;">{{ $m['name'] }}</td>
        <td style="padding: 2px 0;">
          <div class="bar-wrap">
            <div class="bar-fill" style="width: {{ $maxSlices > 0 ? ($m['slices']/$maxSlices)*100 : 0 }}%;"></div>
          </div>
        </td>
        <td style="width:60px; text-align:right; padding: 2px 4px; font-size: 7px; font-weight:bold;">
          {{ number_format($m['slices']) }}
        </td>
      </tr>
      @endforeach
    </table>
  </td>
</tr>
</table>

{{-- spacer --}}
<div style="height: 12px;"></div>

{{-- ═══ RINGKASAN TABLE ═══ --}}
<div class="section-title">Ringkasan Anggota</div>
<table class="data">
  <thead>
    <tr><th>Anggota</th><th>Role</th><th class="text-right">FMR</th><th class="text-right">Slices</th><th class="text-right">Equity</th></tr>
  </thead>
  <tbody>
    @foreach($snapshot['equity_map'] as $m)
    <tr>
      <td>{{ $m['name'] }}</td>
      <td>{{ $m['role'] }}</td>
      <td class="text-right">Rp {{ number_format($m['fmr']) }}</td>
      <td class="text-right">{{ number_format($m['slices']) }}</td>
      <td class="text-right">{{ number_format($m['equity_pct'], 2) }}%</td>
    </tr>
    @endforeach
  </tbody>
  <tfoot>
    <tr>
      <td colspan="2"><strong>Total</strong></td>
      <td class="text-right">—</td>
      <td class="text-right"><strong>{{ number_format($snapshot['total_slices']) }}</strong></td>
      <td class="text-right"><strong>100%</strong></td>
    </tr>
  </tfoot>
</table>

@if(!empty($project_info) && $project_info['total'] > 0)
<div style="margin-top: 10px; font-size: 7px; color: #9A9890;">
  Mencakup {{ $project_info['total'] }} project ({{ $project_info['frozen'] }} frozen, {{ $project_info['active'] }} aktif)
</div>
@endif

</body>
</html>
