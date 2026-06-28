```markdown
# Panduan Pembuatan Diagram draw.io untuk Dokumen Akademik

**Style Guide & Best Practices**  
Data Flow Diagram (DFD) dan Entity Relationship Diagram (ERD)

---

## 1. Prinsip Umum

Panduan ini disusun untuk menghasilkan diagram yang **formal, konsisten, jelas, dan sesuai standar akademik** (skripsi, tugas akhir, laporan magang, dan dokumen ilmiah lainnya).

| Aspek              | Standar yang Digunakan                    | Alasan |
|--------------------|-------------------------------------------|--------|
| Warna              | Hitam-Putih murni                         | Mudah dicetak dan tidak bergantung printer warna |
| Sudut Bentuk       | `rounded=0` (segi empat)                  | Memberikan kesan formal dan teknis |
| Jenis Garis        | Orthogonal (`orthogonalEdgeStyle`)        | Lebih mudah dibaca dan profesional |
| Font               | `fontSize=10`, warna hitam                | Sesuai standar dokumen akademik |
| Ketebalan Garis    | `strokeWidth=2` (shape), `1` (edge)       | Keseimbangan visibilitas |
| Label              | Bahasa Indonesia baku dan formal          | Sesuai kaidah penulisan ilmiah |

---

## 2. Struktur Penamaan File

```
docs/diagram/
├── d1.drawio          → Diagram Konteks (Level 0)
├── d2.drawio          → Diagram Level 0
├── d3.drawio          → Diagram Dekomposisi Proses 1
├── d4.drawio          → Diagram Dekomposisi Proses 2
├── ...                → ...
├── dN.drawio          → Diagram Dekomposisi Proses N
└── erd.drawio         → Entity Relationship Diagram
```

Setiap file `.drawio` hanya berisi **satu diagram**.

---

## 3. Style Sheet Resmi (Hitam-Putih)

### 3.1 External Entity

```xml
style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontColor=#000000;strokeWidth=2;"
```

### 3.2 Process

```xml
style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontColor=#000000;strokeWidth=2;"
```

### 3.3 Data Store

```xml
style="shape=datastore;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontColor=#000000;strokeWidth=2;"
```

### 3.4 Data Flow / Relationship

```xml
style="html=1;fontColor=#000000;strokeColor=#000000;fontSize=10;edgeStyle=orthogonalEdgeStyle;curved=0;rounded=0;"
```

---

## 4. Data Flow Diagram (DFD)

### 4.1 Leveling

- **d1** : Diagram Konteks  
- **d2** : Diagram Level 0  
- **d3–dN** : Diagram Level 1 (rinci)

### 4.2 Aturan Penomoran

- Level 0 : `1`, `2`, `3`, ...
- Level 1 : `1.1`, `1.2`, `2.1`, `2.2`, dst.
- Data Store : `DS1`, `DS2`, `DS3`, ...

Label proses ditulis secara formal, contoh:  
**“1. Pengelolaan Data Mahasiswa”**

### 4.3 Tata Letak yang Direkomendasikan

- Diagram Konteks: 1 proses pusat di tengah, external entity di kiri/kanan.
- Level 0: Proses disusun vertikal di kolom tengah.
- Level Rinci: Sub-proses disusun horizontal atau grid yang rapi.

Setiap data flow hanya memiliki **satu label per garis**.

---

## 5. Entity Relationship Diagram (ERD)

### 5.1 Representasi Entity

Gunakan `shape=table`:

- **Header**: Nama entitas (bold, center)
- **Body**: Daftar atribut

**Format Atribut yang Direkomendasikan:**

- `# id : INTEGER (PK)`
- `* id_mahasiswa : INTEGER (FK)`
- `nama : VARCHAR(100)`
- `alamat : TEXT?`
- `status : ENUM('aktif','nonaktif')`

### 5.2 Relasi

- Notasi **Crow’s Foot**
- Gunakan `orthogonalEdgeStyle`
- Label relasi ditulis italic (contoh: *memiliki*, *merujuk*, *menghasilkan*)
- Usahakan garis relasi terhubung ke atribut yang bersangkutan (field-level connection)

---

## 6. Best Practices Akademik

1. Gunakan style yang **sama persis** di seluruh diagram.
2. Hindari garis bersilangan dengan memanfaatkan waypoint.
3. Tambahkan **legenda notasi** di sudut diagram utama.
4. Beri nomor dan caption yang jelas di laporan, contoh:  
   **Gambar 3.1 Diagram Konteks Sistem**
5. Sesuaikan ukuran canvas agar diagram terbaca jelas saat dicetak.

---

## 7. Template Cepat

**Template DFD Process**

```xml
<mxCell id="p1" vertex="1" parent="1"
  style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontColor=#000000;strokeWidth=2;"
  value="&lt;b&gt;1. Nama Proses&lt;/b&gt;">
  <mxGeometry x="228" y="170" width="150" height="46" as="geometry" />
</mxCell>
```

**Template Entity ERD**

```xml
<mxCell id="ent_tbl" vertex="1" parent="1"
  style="shape=table;childLayout=tableLayout;startSize=0;collapsible=0;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontColor=#000000;">
  <mxGeometry x="30" y="20" width="260" height="180" as="geometry"/>
</mxCell>
```

---

*Dibuat untuk keperluan dokumentasi akademik*