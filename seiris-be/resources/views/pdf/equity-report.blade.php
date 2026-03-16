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
  font-size: 9.5px;
  color: #1A1916;
  background: #fff;
  padding: 36px 40px;
}

/* ── HEADER ── */
.doc-header {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 6px;
}
.doc-header td { vertical-align: bottom; }
.doc-title {
  font-size: 20px;
  font-weight: bold;
  color: #1A1916;
  line-height: 1.2;
}
.doc-subtitle {
  font-size: 10px;
  color: #5C5A54;
  margin-top: 2px;
}
.doc-meta {
  text-align: right;
  font-size: 8px;
  color: #9A9890;
  line-height: 1.8;
}
.header-rule {
  border: none;
  border-top: 2.5px solid #E07820;
  margin: 10px 0 18px;
}

/* ── SECTION TITLE ── */
.section-title {
  font-size: 10px;
  font-weight: bold;
  color: #E07820;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  margin-top: 20px;
  border-bottom: 1px solid #ECEAE4;
  padding-bottom: 4px;
}
.section-title:first-of-type { margin-top: 0; }

/* ── TABLE ── */
table.data {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 14px;
  font-size: 9px;
}
table.data thead tr {
  background: #1A1916;
  color: #F0EDE6;
}
table.data thead th {
  padding: 7px 9px;
  text-align: left;
  font-size: 8px;
  font-weight: bold;
  letter-spacing: 0.3px;
}
table.data tbody tr:nth-child(even) { background: #F9F8F6; }
table.data tbody tr:nth-child(odd)  { background: #fff; }
table.data tbody td {
  padding: 6px 9px;
  border-bottom: 1px solid #ECEAE4;
  vertical-align: middle;
}
table.data tfoot td {
  padding: 7px 9px;
  font-weight: bold;
  border-top: 2px solid #1A1916;
  background: #F4F3EF;
}

/* ── EQUITY BAR ── */
.bar-wrap {
  background: #ECEAE4;
  height: 6px;
  width: 100%;
  border-radius: 1px;
}
.bar-fill {
  height: 6px;
  border-radius: 1px;
  background: #E07820;
}

/* ── BADGES ── */
.badge {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 2px;
  font-size: 7.5px;
  font-weight: bold;
}
.badge-TIME     { background: #DBEAFE; color: #1D4ED8; }
.badge-CASH     { background: #DCFCE7; color: #166534; }
.badge-IDEA     { background: #FEF3C7; color: #92400E; }
.badge-NETWORK  { background: #F3E8FF; color: #7E22CE; }
.badge-FACILITY { background: #FFE4E6; color: #9F1239; }
.badge-REVENUE  { background: #FEE2E2; color: #DC2626; }

/* ── STATUS PILL ── */
.pill-frozen { background: #DBEAFE; color: #1D4ED8; padding: 2px 8px; border-radius: 10px; font-size: 8px; font-weight: bold; }
.pill-active { background: #DCFCE7; color: #166534; padding: 2px 8px; border-radius: 10px; font-size: 8px; font-weight: bold; }

/* ── CALLOUT ── */
.callout {
  background: #FFF8F2;
  border-left: 3px solid #E07820;
  padding: 8px 12px;
  margin-bottom: 14px;
  font-size: 8.5px;
  color: #5C5A54;
  line-height: 1.7;
}
.callout strong { color: #1A1916; }

/* ── LAYOUT HELPERS ── */
.two-col { width: 100%; border-collapse: collapse; }
.two-col td { vertical-align: top; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-orange { color: #E07820; font-weight: bold; }
.text-muted  { color: #9A9890; }
.text-green  { color: #166534; font-weight: bold; }
.fw-bold { font-weight: bold; }
.spacer { height: 16px; }
.spacer-sm { height: 8px; }
.page-break { page-break-after: always; }

/* ── FORMULA ── */
.formula {
  background: #F4F3EF;
  border: 1px solid #ECEAE4;
  padding: 10px 14px;
  margin-bottom: 12px;
  text-align: center;
  font-size: 10px;
  color: #1A1916;
}
.formula .f-main { font-weight: bold; font-size: 11px; }
.formula .f-sub  { font-size: 8px; color: #9A9890; margin-top: 3px; }
.f-orange { color: #E07820; }

/* ── MULTIPLIER TABLE ── */
table.mult tbody td { padding: 5px 9px; }

/* ── FOOTER ── */
.doc-footer {
  position: fixed;
  bottom: 20px;
  left: 40px;
  right: 40px;
  border-top: 1px solid #ECEAE4;
  padding-top: 5px;
  font-size: 7.5px;
  color: #9A9890;
}
.doc-footer table { width: 100%; border-collapse: collapse; margin: 0; }
.doc-footer td { padding: 0; border: none; background: transparent; }
</style>
</head>
<body>

{{-- ── FOOTER (fixed) ── --}}
<div class="doc-footer">
  <table>
    <tr>
      <td>SEIRIS — Smart Equity &amp; Investment Review Integrated System</td>
      <td class="text-right">{{ $team['name'] }} · {{ $generated_at }}</td>
    </tr>
  </table>
</div>

{{-- ══════════════════════════════════════════════════════ --}}
{{-- HEADER                                                 --}}
{{-- ══════════════════════════════════════════════════════ --}}
<table class="doc-header">
  <tr>
    <td>
      <div class="doc-title">{{ $team['name'] }}</div>
      <div class="doc-subtitle">Laporan Equity Tim &amp; Distribusi Slicing Pie</div>
    </td>
    <td class="doc-meta">
      Dibuat: {{ $generated_at }}<br>
      Snapshot: {{ substr($snapshot['snapshot_id'], 0, 8) }}...<br>
      Status: @if($snapshot['is_frozen'])<span class="pill-frozen">FROZEN</span>@else<span class="pill-active">AKTIF</span>@endif
    </td>
  </tr>
</table>
<hr class="header-rule">

{{-- ══════════════════════════════════════════════════════ --}}
{{-- SECTION 1: RINGKASAN + DIAGRAM                         --}}
{{-- ══════════════════════════════════════════════════════ --}}
<div class="section-title">1 · Distribusi Equity Tim</div>

<table class="two-col">
<tr>
  {{-- Pie Chart (SVG) --}}
  <td style="width: 38%; padding-right: 20px;">

    @php
      // Build SVG pie chart
      $colors = ['#E07820','#1D4ED8','#166534','#7E22CE','#9F1239','#92400E','#0891B2'];
      $cx = 90; $cy = 90; $r = 80;
      $total = $snapshot['total_slices'];
      $startAngle = -90; // start from top
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
        // Label position
        $midAngle = $startAngle + $sweep / 2;
        $lx = $cx + ($r * 0.65) * cos(deg2rad($midAngle));
        $ly = $cy + ($r * 0.65) * sin(deg2rad($midAngle));
        $paths[] = compact('x1','y1','x2','y2','largeArc','color','lx','ly','pct','sweep');
        $startAngle = $endAngle;
      }
    @endphp

    <svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" width="160" height="160">
      @foreach($snapshot['equity_map'] as $i => $m)
      @php $p = $paths[$i]; @endphp
      @if(abs($p['sweep'] - 360) < 0.01)
        {{-- Full circle (100%) --}}
        <circle cx="{{ $cx }}" cy="{{ $cy }}" r="{{ $r }}" fill="{{ $p['color'] }}"/>
      @else
        <path d="M {{ $cx }} {{ $cy }} L {{ number_format($p['x1'],4) }} {{ number_format($p['y1'],4) }} A {{ $r }} {{ $r }} 0 {{ $p['largeArc'] }} 1 {{ number_format($p['x2'],4) }} {{ number_format($p['y2'],4) }} Z"
              fill="{{ $p['color'] }}" stroke="#fff" stroke-width="1.5"/>
      @endif
      @if($p['pct'] > 0.06)
        <text x="{{ number_format($p['lx'],2) }}" y="{{ number_format($p['ly'],2) }}"
              text-anchor="middle" dominant-baseline="middle"
              font-family="DejaVu Sans" font-size="9" font-weight="bold" fill="#fff">
          {{ number_format($m['equity_pct'], 1) }}%
        </text>
      @endif
      @endforeach
    </svg>

    {{-- Legend --}}
    <table style="width:100%; border-collapse:collapse; margin-top: 6px;">
      @foreach($snapshot['equity_map'] as $i => $m)
      <tr>
        <td style="width:10px; padding: 2px 0;">
          <div style="width:8px; height:8px; background:{{ $colors[$i % count($colors)] }};"></div>
        </td>
        <td style="padding: 2px 4px; font-size: 8px; color:#1A1916;">{{ $m['name'] }}</td>
        <td style="text-align:right; font-size: 8px; font-weight:bold; color:#E07820; padding: 2px 0;">
          {{ number_format($m['equity_pct'], 2) }}%
        </td>
      </tr>
      @endforeach
    </table>
  </td>

  {{-- Equity Table --}}
  <td style="width: 62%;">
    <table class="data" style="margin-bottom: 0;">
      <thead>
        <tr>
          <th>Anggota</th>
          <th>Role</th>
          <th class="text-right">Slices</th>
          <th class="text-right">Equity</th>
        </tr>
      </thead>
      <tbody>
        @foreach($snapshot['equity_map'] as $i => $m)
        <tr>
          <td>
            <div style="font-weight:bold; color:#1A1916;">{{ $m['name'] }}</div>
            <div class="text-muted" style="font-size:7.5px;">FMR Rp {{ number_format($m['fmr']) }}/jam</div>
            <div class="bar-wrap" style="margin-top:3px;">
              <div class="bar-fill" style="width:{{ min($m['equity_pct'],100) }}%; background:{{ $colors[$i % count($colors)] }};"></div>
            </div>
          </td>
          <td>{{ ucfirst($m['role']) }}</td>
          <td class="text-right">{{ number_format($m['slices']) }}</td>
          <td class="text-right text-orange">{{ number_format($m['equity_pct'], 4) }}%</td>
        </tr>
        @endforeach
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="fw-bold">TOTAL TIM</td>
          <td class="text-right fw-bold">{{ number_format($snapshot['total_slices']) }}</td>
          <td class="text-right fw-bold">100.0000%</td>
        </tr>
      </tfoot>
    </table>
  </td>
</tr>
</table>

{{-- ══════════════════════════════════════════════════════ --}}
{{-- SECTION 2: DETAIL KONTRIBUSI                           --}}
{{-- ══════════════════════════════════════════════════════ --}}
<div class="spacer"></div>
<div class="section-title">2 · Detail Kontribusi per Anggota</div>

@foreach($snapshot['equity_map'] as $i => $m)
@php
  $memberContribs = collect($contributions)->where('member_id', $m['member_id']);
@endphp
@if($memberContribs->isEmpty())
  @continue
@endif

<div style="margin-bottom: 4px; font-weight: bold; font-size: 9px; color: #1A1916; padding: 5px 8px; background: #F4F3EF; border-left: 3px solid {{ $colors[$i % count($colors)] }};">
  {{ $m['name'] }} &nbsp;·&nbsp;
  <span style="color: #E07820;">{{ number_format($m['equity_pct'], 2) }}%</span> &nbsp;·&nbsp;
  <span class="text-muted">{{ number_format($m['slices']) }} slices</span>
</div>

<table class="data">
  <thead>
    <tr>
      <th>Jenis</th>
      <th>Deskripsi</th>
      <th class="text-right">Nilai (Rp)</th>
      <th class="text-center">Mult.</th>
      <th class="text-right">Slices</th>
      <th>Tanggal</th>
    </tr>
  </thead>
  <tbody>
    @foreach($memberContribs as $c)
    <tr>
      <td><span class="badge badge-{{ $c['type'] }}">{{ $c['type'] }}</span></td>
      <td>{{ $c['description'] }}</td>
      <td class="text-right">{{ number_format($c['value']) }}</td>
      <td class="text-center">{{ $c['multiplier'] }}×</td>
      <td class="text-right fw-bold">{{ number_format($c['total_slices']) }}</td>
      <td>{{ $c['date'] }}</td>
    </tr>
    @endforeach
  </tbody>
  <tfoot>
    <tr>
      <td colspan="4" class="fw-bold">Subtotal {{ $m['name'] }}</td>
      <td class="text-right text-orange">{{ number_format($m['slices']) }}</td>
      <td></td>
    </tr>
  </tfoot>
</table>
@endforeach

{{-- ══════════════════════════════════════════════════════ --}}
{{-- SECTION 3: DISTRIBUSI PROFIT (kalau ada)              --}}
{{-- ══════════════════════════════════════════════════════ --}}
@if(!empty($revenues))
<div class="spacer"></div>
<div class="section-title">3 · Riwayat Distribusi Profit</div>

@foreach($revenues as $rev)
<div style="margin-bottom: 4px; font-size: 8.5px; color:#5C5A54; padding: 5px 8px; background:#F9F8F6; border-left: 3px solid #166534;">
  <strong>{{ $rev['description'] }}</strong> &nbsp;·&nbsp;
  Revenue: Rp {{ number_format($rev['amount']) }} &nbsp;·&nbsp;
  Distribusi: Rp {{ number_format($rev['distributable_amount']) }} &nbsp;·&nbsp;
  {{ $rev['revenue_date'] }}
</div>
<table class="data">
  <thead>
    <tr>
      <th>Anggota</th>
      <th class="text-right">Equity % saat itu</th>
      <th class="text-right">Diterima (Rp)</th>
    </tr>
  </thead>
  <tbody>
    @foreach($rev['distributions'] as $d)
    <tr>
      <td class="fw-bold">{{ $d['member_name'] }}</td>
      <td class="text-right">{{ number_format($d['equity_pct'], 4) }}%</td>
      <td class="text-right text-green">Rp {{ number_format($d['amount']) }}</td>
    </tr>
    @endforeach
  </tbody>
  <tfoot>
    <tr>
      <td colspan="2" class="fw-bold">Total Distribusi</td>
      <td class="text-right text-green">Rp {{ number_format(collect($rev['distributions'])->sum('amount')) }}</td>
    </tr>
  </tfoot>
</table>
<div class="spacer-sm"></div>
@endforeach
@endif

{{-- ══════════════════════════════════════════════════════ --}}
{{-- SECTION 4: MODEL SLICING PIE (halaman baru)           --}}
{{-- ══════════════════════════════════════════════════════ --}}
<div class="page-break"></div>

<table class="doc-header">
  <tr>
    <td>
      <div class="doc-title">Model Slicing Pie</div>
      <div class="doc-subtitle">Penjelasan Formula & Multiplier</div>
    </td>
    <td class="doc-meta">{{ $team['name'] }} · {{ $generated_at }}</td>
  </tr>
</table>
<hr class="header-rule">

<div class="formula">
  <div class="f-main">
    Equity%(i) = <span class="f-orange">Slices(i)</span> ÷ <span class="f-orange">Total Slices Tim</span> × 100%
  </div>
  <div class="f-sub">
    Slices = Nilai Kontribusi (Rp) × Multiplier &nbsp;|&nbsp;
    Sumber: Mike Moyer, <em>Slicing Pie</em> (2012)
  </div>
</div>

<table class="data mult">
  <thead>
    <tr>
      <th>Jenis</th>
      <th>Multiplier</th>
      <th>Formula Nilai</th>
      <th>Alasan Risiko</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="badge badge-TIME">TIME</span></td>
      <td class="fw-bold">2×</td>
      <td>Jam kerja × FMR/jam × 2</td>
      <td>Waktu yang dikorbankan tidak dapat dikembalikan</td>
    </tr>
    <tr>
      <td><span class="badge badge-CASH">CASH</span></td>
      <td class="fw-bold text-orange">4×</td>
      <td>Nominal tunai × 4</td>
      <td>Uang hangus 100% jika startup gagal — risiko tertinggi</td>
    </tr>
    <tr>
      <td><span class="badge badge-IDEA">IDEA</span></td>
      <td class="fw-bold">2×</td>
      <td>Setara jam × FMR × 2</td>
      <td>Subjektif — wajib approval voting 75% anggota</td>
    </tr>
    <tr>
      <td><span class="badge badge-NETWORK">NETWORK</span></td>
      <td class="fw-bold">2×</td>
      <td>Setara jam × FMR × 2</td>
      <td>Subjektif — wajib approval voting 75% anggota</td>
    </tr>
    <tr>
      <td><span class="badge badge-FACILITY">FACILITY</span></td>
      <td class="fw-bold">2×</td>
      <td>Nilai sewa/pakai × 2</td>
      <td>Aset tidak habis dikonsumsi (beda dengan cash)</td>
    </tr>
    <tr>
      <td><span class="badge badge-REVENUE">REVENUE</span></td>
      <td class="fw-bold">2×</td>
      <td>(Actual − Invoice dilaporkan) × 2</td>
      <td>Mendorong transparansi penuh dari PM/Sales</td>
    </tr>
  </tbody>
</table>

<div class="spacer"></div>

{{-- Breakdown by type --}}
<div class="section-title">Rekap Slices per Jenis Kontribusi</div>

@php
  $byType = collect($contributions)->groupBy('type');
  $types  = ['TIME','CASH','IDEA','NETWORK','FACILITY','REVENUE'];
@endphp

<table class="data">
  <thead>
    <tr>
      <th>Jenis</th>
      <th class="text-right">Jumlah Log</th>
      <th class="text-right">Total Nilai (Rp)</th>
      <th class="text-right">Total Slices</th>
      <th class="text-right">% dari Total</th>
    </tr>
  </thead>
  <tbody>
    @foreach($types as $type)
    @php
      $grp = $byType->get($type, collect());
      if($grp->count() === 0) continue;
      $tVal    = $grp->sum('value');
      $tSlices = $grp->sum('total_slices');
      $pct     = $snapshot['total_slices'] > 0
        ? round(($tSlices / $snapshot['total_slices']) * 100, 2) : 0;
    @endphp
    <tr>
      <td><span class="badge badge-{{ $type }}">{{ $type }}</span></td>
      <td class="text-right">{{ $grp->count() }}</td>
      <td class="text-right">{{ number_format($tVal) }}</td>
      <td class="text-right fw-bold">{{ number_format($tSlices) }}</td>
      <td class="text-right text-orange">{{ $pct }}%</td>
    </tr>
    @endforeach
  </tbody>
  <tfoot>
    <tr>
      <td colspan="3" class="fw-bold">GRAND TOTAL</td>
      <td class="text-right fw-bold">{{ number_format($snapshot['total_slices']) }}</td>
      <td class="text-right fw-bold">100%</td>
    </tr>
  </tfoot>
</table>

<div class="spacer"></div>

<div class="callout">
  <strong>Catatan Resmi:</strong>
  Dokumen ini dibuat otomatis oleh sistem SEIRIS berdasarkan data kontribusi yang telah disetujui
  melalui mekanisme approval voting. Seluruh data tersimpan di audit log yang bersifat immutable
  (tidak dapat diubah atau dihapus). Laporan ini dapat digunakan sebagai dasar pembuatan cap table
  resmi bersama notaris setelah proses <em>Freeze Equity</em> dilakukan.
</div>

</body>
</html>