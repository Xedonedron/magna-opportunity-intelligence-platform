---

# Product Requirement Document (PRD)

## Project Name
## Magna Opportunity Intelligence Platform (MOIP)

---

# 1. Background

Saat ini proses penanganan opportunity baru di PT Smartnet Magna Global masih dilakukan melalui grup WhatsApp. Tim Lead Generation Officer (LGO) mengirimkan informasi calon customer secara manual, sehingga:

* Informasi sering tidak terstruktur.
* Engineer harus mencari ulang informasi perusahaan sebelum meeting.
* Persiapan meeting memerlukan waktu lama.
* Knowledge antar engineer tidak terdokumentasi.
* Riwayat progress opportunity sulit ditelusuri.
* Tidak ada monitoring terpusat mengenai status opportunity.

Akibatnya meeting sering berjalan kurang efektif karena engineer belum memahami konteks bisnis customer.

---

# 2. Problem Statement

Engineer menghabiskan terlalu banyak waktu untuk melakukan KYC (Know Your Customer) secara manual sebelum meeting.

Tidak ada sistem terpusat yang:

* menyimpan opportunity
* memonitor progress
* menghasilkan company profile otomatis
* menghasilkan rekomendasi use case
* membantu persiapan meeting

---

# 3. Objectives

## Business Objectives

* Mengurangi ketergantungan terhadap WhatsApp.
* Seluruh opportunity terdokumentasi.
* Mempercepat persiapan meeting.
* Meningkatkan kualitas diskusi presales.
* Menjadi single source of truth seluruh opportunity.

---

## Product Objectives

Membangun platform internal yang mampu

* mengelola opportunity
* melakukan AI KYC otomatis
* menghasilkan meeting preparation
* memberikan monitoring progress
* mengintegrasikan email dan Google Calendar

---

# 4. Target Users

| Role                    | Capability                   |
| ----------------------- | ---------------------------- |
| Admin                   | Full Access                  |
| Lead Generation Officer | Create & Manage Opportunity  |
| Engineer                | View, Edit KYC, Generate KYC |
| Manager                 | Dashboard & Monitoring       |

Seluruh user menggunakan autentikasi Google Workspace.

---

# 5. Success Metrics

* 100% opportunity tercatat di sistem.
* Waktu persiapan meeting berkurang secara signifikan.
* Engineer tidak lagi melakukan riset perusahaan secara manual.
* Seluruh KYC selesai dalam target kurang dari 5 menit.
* Seluruh meeting memiliki riwayat dan dokumentasi.

---

# 6. Opportunity Lifecycle

```
New

↓

KYC Running

↓

Ready Meeting

↓

Meeting Scheduled

↓

Meeting Done

↓

Need Proposal / Solution Brief

↓

Negotiation

↓

PO

↓

Won

↓

Lost

↓

On Hold
```

---

# 7. Features

## Authentication

* Login Google Workspace
* Role-based Access

---

## Dashboard

Menampilkan

* Total Opportunity
* New
* Meeting Today
* KYC Running
* KYC Completed
* Need Follow Up
* Won
* Lost

Revenue pipeline hanya terlihat oleh Manager.

---

## Opportunity Management

Opportunity memiliki

* Company Name *
* Website
* Email
* Phone
* Industry
* Meeting Schedule
* Product
* Customer Needs *
* Additional Notes

(*) Mandatory

---

## Timeline

Semua aktivitas tercatat.

Contoh

```
Opportunity Created

↓

KYC Started

↓

KYC Completed

↓

Meeting 1

↓

Meeting Note Updated

↓

Proposal Uploaded

↓

Status Changed
```

---

## Meeting Management

Satu Opportunity dapat memiliki banyak Meeting.

Setiap Meeting memiliki

* Date
* Participants
* Agenda
* Notes
* Action Items
* Attachments

---

# 8. AI KYC

KYC berjalan otomatis ketika Opportunity dibuat.

Engineer juga dapat menjalankan ulang KYC kapan saja.

AI mencari informasi dari

* Website resmi
* LinkedIn
* News

Jika URL tersedia, AI memprioritaskan URL tersebut dan menggabungkannya dengan hasil pencarian lainnya.

---

## Output

### Executive Summary

### Company Overview

### Industry

### Business Model

### Company Location

### Customer Need Summary

### Potential Pain Points

### Relevant Industry Use Cases

Setiap use case memiliki tampilan expandable yang berisi:

* Deskripsi singkat.
* Permasalahan yang diselesaikan.
* Cara kerja solusi.
* Dampak bisnis yang dihasilkan.
* Produk Google yang relevan.
* Solusi Smartnet Magna yang relevan (berbasis RAG).

### Meeting Objectives

### Recommended Questions

### Preparation Checklist

### References

---

# 9. KYC Versioning

Seluruh hasil KYC memiliki versi.

```
v1

Automatic

---------------

v2

Manual Regenerate

---------------

v3

Engineer Edited

```

Engineer dapat melihat riwayat perubahan maupun mengedit hasil KYC.

---

# 10. Notifications

Sistem mengirimkan notifikasi ketika:

* Opportunity dibuat.
* KYC selesai.
* Status berubah.
* Meeting H-1.
* Meeting H-30 menit.
* Proposal belum dibuat setelah meeting.

Notifikasi dikirim melalui email.

---

# 11. Google Integration

Google Calendar

* Membuat event otomatis.
* Mengundang peserta.

Gmail

* Reminder meeting.
* Reminder follow up.
* Notifikasi KYC selesai.

---

# 12. Future Enhancement

* AI Meeting Summary.
* AI Proposal Draft.
* AI Solution Brief Generator.
* AI Next Action Recommendation.

---