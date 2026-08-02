# 📋 Implementation Plan: Interactive Kanban Board View for Opportunities

Dokumen ini berisi rencana implementasi lengkap untuk menambahkan tampilan **Kanban Board (Drag-and-Drop)** pada halaman Opportunities di **Magna Opportunity Intelligence Platform (MOIP)**.

---

## 🎯 1. Ringkasan & Tujuan Fitur

Tampilan Kanban memungkinkan pengguna (LGO, Presales Engineer, Manager) untuk:
1. Memvisualisasikan seluruh peluang berdasarkan **11 kolom status** secara interaktif.
2. Mengubah status peluang dengan mudah melalui aksi **Drag-and-Drop (geser kartu)**.
3. Beralih secara instan antara **Tampilan Tabel (List View)** dan **Tampilan Kanban (Kanban View)**.
4. Memperbarui status secara *optimistic* di antarmuka dengan sinkronisasi otomatis ke backend & timeline audit log.

---

## 🏗️ 2. Arsitektur & Perubahan Komponen

```
[ Opportunities Page: /opportunities ]
          │
          ├── Toggle View (List View ↔ Kanban View)
          │
          ├── [ List View ] (Existing DataTable)
          │
          └── [ Kanban View ] (New Component)
                  │
                  ├── KanbanHeader (Quick Search, Filters, Column Aggregates)
                  │
                  └── KanbanBoard (DragDropContext)
                          │
                          └── KanbanColumn (Droppable by Status)
                                  │
                                  └── KanbanCard (Draggable Opportunity Card)
```

---

## 🧩 3. Rincian Task & Tahapan Implementasi

### Phase 1: Dependensi & UI Infrastructure
- [ ] **Install Library Drag-and-Drop:**
  - Menggunakan `@hello-pangea/dnd` (fork resmi `react-beautiful-dnd` yang teruji & kompatibel dengan React 18/19 & Next.js 15 Client Components) atau `@dnd-kit/core`.
  ```bash
  npm install @hello-pangea/dnd
  ```
- [ ] **View Switcher Toggle:**
  - Tambahkan komponen toggle switcher di header halaman [`opportunities/page.tsx`](file:///E:/SMG%20-%20Internal/magna_opportunity_intelligence_platform/frontend/src/app/(main)/opportunities/page.tsx).
  - Simpan preferensi pengguna (List/Kanban) di `localStorage` (`moip_opportunities_view`).

---

### Phase 2: Komponen Frontend Kanban Board

#### 1. `KanbanCard.tsx` (`frontend/src/components/domains/opportunities/KanbanCard.tsx`)
- Komponen kartu peluang draggable yang menampilkan:
  - **Company Name** (link ke detail `/opportunities/[id]`).
  - **Industry Badge** & **Product Target**.
  - **Estimated Value** (Format Rupiah IDR).
  - **Indikator KYC** (New / Running / Ready / Complete).
  - **Jadwal Meeting mendatang** (jika ada).
  - **Avatar/Initial Assigned Engineer**.

#### 2. `KanbanColumn.tsx` (`frontend/src/components/domains/opportunities/KanbanColumn.tsx`)
- Kolom Droppable yang dikelompokkan berdasarkan **Status**:
  - Kolom default: `New`, `KYC Running`, `Ready Meeting`, `Meeting Scheduled`, `Meeting Done`, `Need Proposal`, `Negotiation`, `PO`, `Won`, `Lost`, `On Hold`.
  - **Header Kolom:** Nama Status, Warna Badge, Jumlah Card, dan Total Estimasi Nilai Peluang dalam kolom tersebut.
  - Tampilan *empty placeholder* jika belum ada peluang di status tersebut.

#### 3. `KanbanBoard.tsx` (`frontend/src/components/domains/opportunities/KanbanBoard.tsx`)
- Container pembungkus dengan *horizontal scrolling* halus.
- Menangani event `onDragEnd`:
  - Mengambil `opportunityId`, `sourceStatus`, dan `destinationStatus`.
  - Jika status berubah, memicu pembaruan ke API backend.

---

### Phase 3: Synchronisasi State & Optimistic UI Update

#### 1. Custom Hook & React Query Integration
- Gunakan React Query `useUpdateOpportunity` untuk update status:
  - **Optimistic Update (`onMutate`):** Kartu langsung berpindah ke kolom tujuan di layar tanpa menunggu respons server.
  - **Error Rollback (`onError`):** Mengembalikan posisi kartu ke kolom asal dan menampilkan pesan error via Toast jika API gagal.
  - **Invalidate Queries (`onSettled`):** Memperbarui cache React Query dan memicu re-fetch metrik dashboard.

#### 2. Audit Trail & Timeline Event
- Perubahan status via Drag-and-Drop otomatis mencatat event di database backend (`timeline_events`) dan mengirim notifikasi jika diperlukan.

---

### Phase 4: Filter & Akses Kontrol (RBAC)

1. **Integrasi Filter:**
   - Pencarian global (Nama Perusahaan / Kebutuhan).
   - Filter Engineer dan Rentang Tanggal tetap berlaku secara *real-time* di Tampilan Kanban.

2. **Batasan Akses (Capabilities):**
   - Hanya pengguna dengan kapabilitas **`Create & Edit`** yang dapat menggeser kartu (Drag-and-Drop enabled).
   - Pengguna dengan kapabilitas **`View Only`** tetap dapat melihat Kanban Board dalam mode *read-only* (Drag disabled).

---

## 📅 4. Estimasi Timeline Pengerjaan

| Tahapan | Deskripsi | Durasi Est. |
| :--- | :--- | :--- |
| **Tahap 1** | Install dependensi & buat UI Toggle Switcher | 0.5 Hari |
| **Tahap 2** | Pengodingan `KanbanCard`, `KanbanColumn`, & `KanbanBoard` | 1 Hari |
| **Tahap 3** | Integrasi API Drag-and-Drop & Optimistic State Update | 1 Hari |
| **Tahap 4** | Penyesuaian Filter, Responsive Styling, & Akses Kontrol (RBAC) | 0.5 Hari |
| **Tahap 5** | Testing End-to-End & Polish Micro-animations | 0.5 Hari |
| **TOTAL** | **Siap Rilis Production** | **3.5 Hari Kerja** |

---

## 🧪 5. Skenario Pengujian (Testing Strategy)

1. **Uji Drag-and-Drop Normal:**
   - Geser kartu dari kolom `New` ke `KYC Running`.
   - Verifikasi status berubah di database dan timeline mencatat "Status Changed".
2. **Uji Hak Akses (RBAC):**
   - Login sebagai role **Viewer** -> Kartu tidak dapat digeser (cursor default/not-allowed).
   - Login sebagai role **Presales Engineer** / **Sales** -> Kartu dapat digeser secara bebas.
3. **Uji Koneksi Gagal (Optimistic Rollback):**
   - Matikan jaringan saat menggeser kartu -> Kartu kembali ke posisi asal dan muncul pesan error.
4. **Uji Filter & Pencarian:**
   - Ketik nama perusahaan di kolom search -> Kanban board menyaring kartu secara *real-time*.
