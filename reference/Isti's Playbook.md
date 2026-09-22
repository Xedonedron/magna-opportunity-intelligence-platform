Berikut adalah transkripsi lengkap seluruh teks dari dokumen tanpa perubahan atau penambahan:

---

### **Halaman 1**

**SOLUSI SECURITY**

**A. Previleged Access Management (PAM)**

= manajemen pengawasan akses istimewa untuk mengurangi risiko keamanan yang terkait dengan hak Istimewa.

gambaran: Karena perusahaan memiliki banyak peralatan (server, end point, dll) pasti akan lupa untuk password setiap peralatannya adanya PAM untuk memanage password tsb. ketika user ingin mengakses baru diberi passwordnya oleh orang yg memiliki keistimewaan ini dan bisa dipantau aksesnya dari awal - akhir

Brand: cyberark, Beyond trust, one identity, senhasegura, delinea

**B. Next Generation Firewall (NGFW)**

= memeriksa jaringan lalu lintas melindungi mengidentifikasi & blokir cyber, mencegah kebocoran data

Brand: Fortinet, Paloalto, checkpoint, sophos, sangfor, Cisco, Hillstone, Huawei

**C. Data Loss Prevention (DLP)**

= mendeteksi & mencegah pelanggaran data, memblokir ekstraksi data sensitif

* data tak bisa di download / diprint


* data tak bisa ke upload di G-drive


* data tak bisa ke upload di flashdisk


minimal 10 data sensitif: NIK, alamat, TTL, no hp, kartu keluarga dll.


Brand: Symantec broadcom, Mc. Afee (Trellix), digital guardian, intune, forcepoint



**D. End point security & detection response**

= berupa anti virus mencegah serangan cyber & mencegah setelah terjadinya serangan cyber diend point kita. Bisa jalan 3 OS: LINUX, windows, Mac os

Brand: Crowd strike, trellix, Sentinelone, trend micro, sophos

**E. SIEM/SOAR**

* SIEM: menginfokan kpd user bahwa infrastruktunya ada kerusakan/warning


* SOAR: tindakan dari SIEM



---

### **Halaman 2**

contoh penerapan SIEM/SOAR:

*(Diagram alur: Server / Firewall / core switch / switch / access point / pc, laptop / PC)*

* SIEM: mengumpulkan info kpd user berupa report ke g-mail


* SOAR Fitur: playbook (aturan yg sdh dibuat), analysis security, insident responce (jika ada insiden tertentu), automatication schedule (sifat yg rutin dlm merespon masalah yg terjadi)


Brand: Arcsight, Log Rhym, Splunk



**F. Solusi End Point Previleged Management (EPM)**

= mengontrol yg terjadi pd end point

* compliance (pengecekan udh sesuai aturan / blm)


misalnya: dlm perusahaan memberikan pinjaman laptop kpd pekerjanya, hal ini bisa dibatasi penggunaannya / di control (disable usb / external storage / printer, disable install/uninstall, disable configure wallpaper)


Brand: Beyondtrust, Delinea



**G. Vulnerability Management**

= meng screening celah pada IT infra dan akan melaporkan bahwa ada yg aneh/tanda cyber

Brand: Tenable, Rapid 7

**H. Multifactor Authentication (MFA)**

dapat digunakan pada sistem OS (windows, Linux, MAC OS, dan sistem mobile seperti android/IOS), pada aplikasi layanan cloud, sistem basis data: My SQL, SQL server, server virtualisasi (Vmware/hyper-V), remote access, peralatan jaringan (akses konfig), end point security (bisa diintegrasikan EDP)

Brand: watch guard, RSA, CISCO

---

### **Halaman 3**

**I. Mail Security Gateway**

= dikhususkan untuk email. Biasanya yg menggunakan banking & FSI untuk compliance PCI DSS (perlindungan kartu kredit) ISO.

fitur-fitur security gateway:

* Filtering spam: bisa memfilter spam berupa konten dll yg bisa membahayakan perusahaan.


* analisis malware: attachment email (menganalisis dokumen email yg masuk bisa berupa pdf) walau membahayakan tak bisa dibuka, kalau masih mau membahayakan user bisa lihat di log email


* deteksi phising: bisa menganalisis URL yg bahaya & tak


* enkripsi email: email hanya bisa dibaca oleh penerima, tdk bisa di forward. Kl dipaksa forward tulisannya jd acak


* quarantine: mengkarantinakan pesan yg dianggap spam (email marketing) tp serasa bkn spam masih bisa dilihat


Brand: proofpoint, fortimail, mc-afee



**J. Identity Governance & Administration Management (IAM)**

= untuk HR: contoh ketika ada user on board, move, or resign

ex: CTI, saat on board karyawan dapat: SINTA, SICTI, GWS (gmail). nah fungsi IAM untuk mengatur semua aplikasi ini untuk karyawannya. yg diatur: Job role, jabatan, divisi, tgl join/move/resign

Brand: Sailpoint, IBM, oracle

**K. Network Access Control (NAC)**

= Memonitor, Mengontrol siapa saja yg masuk ke dalam jaringan kita. Misalnya Mengontrol penggunaan jaringan untuk end point pekerjaan dgn end point pribadi. Bisa dicontrol & disarankan kepada yg cocok dgn penggunaan jaringan Misalnya network guest & network pekerjaan.

Brand: Cisco ISE; Forescout; Aruba Clearpass, FortiNAC, Ivanti NAC, Genians.

---

### **Halaman 4**

**L. Web Application Firewall (WAF)**

Melindungi aplikasi web dgn memfilter, memantau, dan memblokir HTTPS berbahaya apapun yg masuk ke app web dan mencegah data tak sah meninggalkan aplikasi

Brand: Akamai; Cloudflare; Imperva; Fortiweb WAF; F5; Radware

**M. Network Detection & Response (NDR)**

Keamanan canggih yg menggunakan AI seperti pembelajaran mesin untuk mendeteksi & memperingatkan potensi ancaman siber dalam jaringan organisasi.

Brand: Darktrace; Extrahop; Cisco; Sophos

---

### **Halaman 5 (Tabel Cetak Bagian 1)**

| Product Type | Key Point | Function | Product Merk |
| --- | --- | --- | --- |
| **Network Access Control**<br> | Memberikan visibilitas ke perangkat dan pengguna yang mencoba mengakses jaringan perusahaan. Dan ia mengontrol siapa yang dapat mengakses jaringan, termasuk menolak akses ke pengguna dan perangkat yang tidak mematuhi kebijakan keamanan.

 | Autentikasi, otorisasi, postur keamanan, penegakan kebijakan, pemantauan dan pelaporan

 | Cisco ISE, Forescout, Aruba Clearpass, FortiNAC, Ivanti NAC, Genians

 |
| **Software Defined Infrastructure**<br> | Kontrol bagaimana beban kerja TI didistribusikan dan kurangi latensi dengan mengakses dan mengotomatisasi sebagian besar seluruh lingkungan operasi dari jarak jauh dengan intervensi manusia yang rendah, termasuk server, penyimpanan, dan jaringan.

 | Memodifikasi dan mendistribusikan solusi perangkat lunak dengan mudah

 | DellEMC, Microsoft Azure, HPE

 |
| **Open Source Software**<br> |  |  | Red Hat, Ubuntu, Oracle Linux

 |
| **Disk Array and Storage Solutions (Server & Storage)**<br> | Performa tinggi dari rangkaian all-flash pada platform flash hibrid Anda, memungkinkan Anda memanfaatkan nilai data dengan mudah

 | kapasitas penyimpanan yang besar, performa yang lebih tinggi, redundansi data, ketersediaan yang lebih tinggi

 | DellEMC, Netapp, Hitachi, HPE, Pure Storage, Huawei, Lenovo

 |
| **Privileged Access Management (PAM)**<br> | Kontrol Akses dan persetujuan terhadap Aset TI (Peralatan, Server, Aplikasi, dll), melakukan pencatatan, mengelola kata sandi kredensial

 | Membantu melindungi organisasi dari ancaman cyber dengan memantau, mendeteksi, dan mencegah akses istimewa yang tidak sah ke sumber daya penting.

 | Cyber Ark, Beyond Trust, One Identity, Senhasegura, Delinea

 |
| **Next Generation Firewall**<br> | Analisis lalu lintas masuk, kendalikan aplikasi Anda, cegah intrusi, serta sediakan data ancaman, sehingga menurunkan risiko pelanggaran data.

 | Memeriksa semua jaringan lalu lintas, Mengidentifikasi dan memblokir ancaman cyber, Melindungi aplikasi, Mencegah kebocoran data, Memberikan visibilitas yang lebih baik

 | Fortinet, Palo Alto, Checkpoint, Sophos, Sangfor, Cisco, Hillstone, Huawei

 |
| **Web Application Firewall**<br> | melindungi aplikasi web Anda dengan memfilter, memantau, dan memblokir lalu lintas HTTP/S berbahaya apa pun yang masuk ke aplikasi web, dan mencegah data tidak sah meninggalkan aplikasi.

 | memblokir serangan umum, melindungi data sensitif, mematuhi peraturan, mencegah penyalahgunaan aplikasi

 | Akamai, Cloudflare, Imperva, Fortiweb WAF, F5, Radware

 |
| **Vulnerability Management**<br> | Membantu Anda mengidentifikasi, menyelidiki, melaporkan, dan mengatasi kerentanan keamanan

 | identifikasi kerentanan, penilaian kerentanan, prioritas kerentanan, penanganan kerentanan

 | Tenable, Rapid 7

 |
| **Data Loss Prevention**<br> | mendeteksi dan mencegah pelanggaran data. Karena memblokir ekstraksi data sensitif

 | Melindungi data sensitive, Mematuhi peraturan, Mencegah pelanggaran data, Meminimalkan resiko kerusakan reputasi

 | Symantec Broadcom, Mc.Afee(Trellix), Digital Guardian, Intune, Forcepoint

 |
| **End Point Security**<br> | melindungi desktop, laptop, server, dan perangkat dengan fungsi tetap dari ancaman internal dan eksternal yang berbahaya.

 | Pencegahan, deteksi&respon, pemulihan

 | Trendmicro (Next Generation End Point Security), Crowdstrike, Mc.Afee, Kaspersky, Sangfor, Sophos

 |
| **End Point Detection & Response**<br> | Pantau dan kumpulkan data aktivitas dari titik akhir yang dapat mengindikasikan adanya ancaman. Analisis data ini untuk mengidentifikasi pola ancaman. Secara otomatis merespons ancaman yang teridentifikasi untuk menghilangkan atau membendungnya, dan memberi tahu personel keamanan.

 | Deteksi ancaman, Investigasi ancaman, Respon ancaman

 | Crowdstrike, Trellix, Sentinelone, Trendmicro, Sophos

 |
| **Network Detection & Response**<br> | produk keamanan canggih yang menggunakan kecerdasan buatan (AI) seperti pembelajaran mesin untuk mendeteksi dan memperingatkan potensi ancaman siber dalam jaringan organisasi

 | analisis traffic jaringan, analisis perilaku pengguna, analisis log

 | Darktrace, Extrahop, Cisco, Sophos

 |
| **Multifactor Authentication**<br> | proses login akun multi-langkah yang mengharuskan pengguna memasukkan lebih banyak informasi daripada sekadar kata sandi. Misalnya, bersama dengan kata sandi, pengguna mungkin diminta memasukkan kode yang dikirimkan ke email mereka, menjawab pertanyaan rahasia, atau memindai sidik jari.

 |  | Watchguard, RSA, Cisco

 |
| **End Point Privileged Management**<br> | Sebagai lapisan keamanan tambahan untuk mengelola dan menegakkan kepatuhan di Titik Akhir (Menerapkan konfigurasi keamanan titik akhir dan kebijakan peraturan kepatuhan).

 | just in time (JIT), least privilege access, elevasi privileged request management, session monitoring dan recording, mitigasi lateral movement

 | Beyondtrust, Delinea

 |
| **SIEM (Security information and event management)**<br> | solusi keamanan yang membantu organisasi mengenali dan mengatasi potensi ancaman dan kerentanan keamanan sebelum mengganggu operasi bisnis.

 | pengumpulan data, normalisasi data, korelasi data, analisis data, alerting dan notifikasi, investigasi dan respon

 | ArcSight, Log Rhythm, Splunk

 |
| **Identity Management**<br> | mencegah akses tidak sah terhadap sistem dan sumber daya, membantu mencegah penyelundupan data perusahaan atau data yang dilindungi, dan meningkatkan peringatan dan alarm ketika upaya akses dilakukan oleh personel atau program tidak sah, baik dari dalam atau luar batas perusahaan.

 | pendaftaran dan autentikasi, otorisasi dan kontrol akses, manajemen sesi, manajemen kata sandi, audit dan kepatuhan

 | Sailpoint

 |

---

### **Halaman 6 (Tabel Cetak Bagian 2)**

| Kategori | Product Type | Key Point | Function | Product Merk |
| --- | --- | --- | --- | --- |
| **Infrastructur**<br> | **Backup and Recovery**<br> | Back up data, bisa melakukan restorasi

 | backup: melindungi data dari kehilangan (kegagalan hard drive, malware, kesalahan manusia), memenuhi persyaratan, mempercepat pemulihan dari bencana; recovery: memulihkan data yang hilang/rusak, mempercepat downtime, meminimalkan dampak finansial

 | DellEMC, Rubrik, Commvault, Veeam, Symantec

 |
| **Data center**<br> | **Networking (Switch, Routers, Access Point)**<br> | Jaringan nirkabel dan virtual, pusat data dan jaringan kampus, jaringan area penyimpanan, dan solusi jaringan terbuka, menggunakan beragam teknologi nirkabel.

 | komunikasi, berbagi data, akses sumber daya (printer, scanner), kolaborasi, hiburan, bisnis, pendidikan, pemerintah

 | Cisco, Huawei, DellEMC, HPE, Sundray, Extreme Network

 |
|  | **Server Virtualisation**<br> | memungkinkan komputer untuk berbagi sumber daya perangkat kerasnya dengan beberapa lingkungan yang terpisah secara digital. Setiap lingkungan tervirtualisasi berjalan sesuai sumber daya yang dialokasikan, seperti memori, daya pemrosesan, dan penyimpanan.

 | pemanfaatan sumber daya yang lebih baik, fleksibilitas dan skalabilitas, high availability dan disaster recovery, pengujian dan pengembangan, isolasi dan keamanan

 | VMware, Hyper-V, RHEV, Huawei DCS, Sangfor

 |
|  | **Rack Server**<br> |  | menghemat ruang, keamanan, kemudahan manajemen, skalabilitas

 | Rittal, APC

 |
|  | **Mobility (Mobile Device Management)**<br> | Membantu Anda memantau, mendapatkan visibilitas, dan mengelola perangkat bisnis Anda untuk mengurangi risiko masalah keamanan dan kepatuhan. Lindungi data bisnis Anda dengan cara sesederhana mungkin untuk meningkatkan produktivitas dan komunikasi karyawan.

 | pendaftaran perangkat, keamanan perangkat, manajemen aplikasi, manajemen konten, pemantauan perangkat

 | Vmware Workspace One, Citrix, Soti, Mobile Iron (Ivanti), HMS

 |
| **Data**<br> | **Data Warehouse**<br> | Sistem penyimpanan data terpusat yang memungkinkan Anda mengintegrasikan data dari berbagai sumber ke satu tempat, memungkinkan Anda membuat keputusan bisnis yang lebih baik dan meningkatkan efisiensi sistem dengan menyederhanakan aliran data

 | membuat keputusan yang lebih baik, meningkatkan efisiensi, meningkatkan kepuasan pelanggan, mengurangi risiko

 | Oracle, Vmware Tanzu (Greenplum), Cloudera, Hadoop, Snowflake, Big Query by Google, Harabdata

 |
|  | **Unified End Point Management**<br> | mengelola, mengamankan, dan menyebarkan sumber daya dan aplikasi perusahaan pada perangkat apa pun dari satu konsol Pengelolaan titik akhir terpadu merupakan satu langkah melampaui pengelolaan perangkat seluler tradisional.

 | pendaftaran dan provisioning, keamanan perangkat, manajemen aplikasi, manajemen konten, pemantauan perangkat

 | Ivanti, Managed Engine

 |
|  | **Software Monitoring (Network Monitoring)**<br> | pantau seluruh jaringan Anda (Dan juga Aplikasi) secara real time dari satu mesin

 | pemantauan kinerja, ketersediaan, keamanan, sumber daya, aplikasi

 | Solarwinds, PRTG, Managed Engine, Dynatrace, BMC

 |
|  | **Load Balancing**<br> | mendistribusikan lalu lintas jaringan secara merata ke seluruh kumpulan sumber daya yang mendukung aplikasi.

 | meningkatkan performa, meningkatkan ketersediaan, meningkatkan skalabilitas

 | Radware, F5

 |
| **Other**<br> | **SD-Wan**<br> | meningkatkan waktu kerja dan ketangkasan bisnis sekaligus mengurangi biaya operasional dan kompleksitas. Selain itu, SD-WAN menghadirkan kesederhanaan manajemen dengan konsol terpusat yang memungkinkan bisnis mengontrol dan menskalakan jaringan cabang.

 | peningkatan performa, keamanan, efisiensi operasional, pengurangan biaya

 | Aruba Edgeconnect, Sangfor, Fortinet, Cisco, Versa Network

 |
|  | **Hyperconverged Infrastructure (HCI)**<br> | menyederhanakan VDI (Virtual Desktop Infrastructure), mendukung kebutuhan TI dan penyimpanan yang kompleks namun tetap hemat biaya. Komputasi edge: HCI memudahkan perancangan, pembangunan, dan penskalaan lingkungan edge atau cabang tanpa staf TI khusus di lokasi.

 | meningkatkan kegunaan, produktivitas, kepuasan pelanggan, aksesibilitas

 | HPE Simplivity, Nutanix, VMware (vSAN), Sangfor

 |
|  | **IT Asset Management**<br> | pelacakan dan pengelolaan aset TI (Perangkat Keras dan Perangkat Lunak) secara menyeluruh untuk memastikan bahwa setiap aset digunakan, dipelihara, ditingkatkan, dan dibuang dengan benar pada akhir siklus hidupnya.

 | perencanaan, pengorganisasian, pengendalian, pengoptimalan

 | Ivanti, Service Now, BMC, Managed Engine

 |

---

### **Halaman 7**

**NETWORK**

*(Diagram topologi: ISP -> Firewall / router -> core switch -> Switch distribution -> Switch -> access point / Server / pc laptop)*

Jaringan nirkabel dan virtual, Pusat data dan jaringan kampus, Jaringan area penyimpanan dan solusi jaringan terbuka, menggunakan beragam teknologi nirkabel.

Brand: Cisco, Huawei, Dell EMC, HPE, Sundray, Extreme Network

Yang mungkin bisa ditanyakan kepada user terkait network:

① Bagaimana struktur & topologi jaringannya?

② Bagaimana performa Jaringan biasanya? Apakah ada masalah kecepatannya / performanya?

③ Apa jenis firewall yg digunakan?

④ Apakah ada rencana untuk upgrade perangkat keras / memperluas jaringan?

⑤ Bagaimana Jaringan ini dipantau? Apakah menggunakan perangkat lunak manajemen Jaringan / Sistem pemantauan?

* Tanyakan terkait topologi jaringannya


firewall / router -> Switch -> access point


Jaringan yg terhubung? LAN, WAN, MAN


* Tanyakan security nya


MDR (monitoring), WAF (website), NGFW (Firewall)



---

### **Halaman 8**

**Solusi Cloud**

**A. Google Cloud Platform (GCP)**

* fitur-fitur:


* IAAS


* PAAS


* SAAS


* infrastructure modernization


* apps modernization


* data analytics, data engineer, machine learning AI


* Security modernization


* cloud storage; mysql; bigquery (data)




* Pengguna:


a. Rumah Sakit (data medis, analitik dan penelitian)


b. Manufaktur (analitik data produksi dan pengelolaan operasional)


c. Media Hiburan (Konten, analitik, dan distribusi)


d. Ritel (Manajemen inventoris, analitik data pelanggan dan pengoptimalan rantai pasokan)


e. Keuangan (analitik data, manajemen risiko, dan kebutuhan regulasi)


f. Teknologi & Startup (kemudahan integrasi dgn berbagai alat pengembangan)



**B. Google Workspace (GWS)**

* fitur-fitur: gmail, google chat, g-meet, alat pengembang, fitur pendidikan, keamanan & privasi, penyimpanan & berbagi file



**C. Google Maps**

google Maps digunakan untuk membantu para customer (perusahaan) untuk meningkatkan bisnis, agar rute/lokasi yg dituju bisa pas/sesuai

Contoh perusahaan:

* Ekspedisi: digunakan untuk melihat track perjalanan barang yg dikirim


* E-Commerce: digunakan untuk melihat barang sudah sampai dimana.



---

### **Halaman 9**

**SOLUSI ON-PREM**

**A. Server Virtualisasi**

Brand: Huawei, Sangfor, VMware, Hyper-V, RHEV

**B. HCI (Hyperconverged Infrastructure)**

Brand: HPE Simplivity, Nutanix, VMware (VSAN), Sangfor

Penjelasan server virtualisasi: virtualisasi pada server fisik. Membagi satu server fisik menjadi beberapa server virtual

Virtualisasi: pengefesiensian dari resource misalnya kita memiliki HP yang Ramnya 8; memori 256 GB belum tentu kita gunakan semua, supaya bisa tergunakan semua maka menggunakan virtualisasi

HCI: penggabungan antara server & storage cocok utk perusahaan yg memiliki rack server kecil

---

### **Halaman 10**

**SOLUSI DATA ANALITIK**

**A. Data Warehouse**

Brand: Oracle, Vmware Tanzu (Greenplum), Cloudera, Hadoop, Snowflake, Harahdata, Big Query by Google

Data Analitik: Kegiatan yg dilakukan untuk mengeksplorasi, menginterpretasi, dan komunikasi supaya dapat insight. Proses dari data analitik ini dipandu dgn data journey (mulai dari pengumpulan - visualisasi)

Kenapa data analitik penting?

* Pengambilan keputusan berdasarkan informasi & bukti


* optimalisasi proses bisnis


* identifikasi peluang bisnis baru


* personalisasi pengalaman pelanggan


* Inovasi & pertumbuhan bisnis



**DATA FRAMEWORK UNTUK DATA JOURNEYS**

data culture (alur data yg akan berjalan sesuai control)

Data Producers -> Collect & Publish -> Store & process -> Analyze & activate -> AI-powered outcomes -> Data Consumers

*(Govern & Control)*

**Turunan Data Framework**

| Functions | Collect & publish | Store & process | Analyze & activate | AI powered |
| --- | --- | --- | --- | --- |
|  | - data ingestion

<br>

<br>- data pipeline

<br>

<br>- data catalog

 | - data lake

<br>

<br>- data warehouse

<br>

<br>- data cleaning

<br>

<br>- data modeling

 | - descriptive analytics

<br>

<br>- diagnostics analytics

<br>

<br>- data-driven decision making

 | - machine learning

<br>

<br>- Machine Vision

<br>

<br>- natural language Processing

 |
|  | mengumpulkan data & dipublish/taro data di warehouse / data lake

 | memproses data struktur/tdk terstruktur

 | digunakan jika data sdh bersih

 | tahapan akhir data analitik

 |

---

### **Halaman 11**

* **Data Terstruktur**

= Data dalam bentuk jelas seperti: CSV, PDF, XLSX, DOCS


-> **Data Warehouse**: gudang data yg menyimpan data dalam bentuk data yg terstruktur


* **Data tidak terstruktur**

= Data yg bisa berubah / tak jelas seperti: image, video, audio


-> **Data Lake**: tempat penyimpanan utk data mentah / raw data



Keunggulan big query: selain bisa menyimpan, bisa untuk analisis jg

---

### **Halaman 12**

**Others Solution**

**A. Software Define Infrastructure (SDI)**

Brand: Dell EMC, Microsoft Azure, HPE

**B. Open Source Software**

Brand: Red Hat, Ubuntu, Oracle Linux

**C. Disk Array & Storage Solution (Server & storage)**

Brand: Dell EMC, Netapp, Hitachi, HPE, Pure Storage, Huawei, Lenovo

**D. Backup & recovery**

Brand: Dell EMC, Rubrik, Commvault, Veeam, symantec

**E. Rack Server**

Brand: Rittal, APC

**F. Mobile**

Brand: Vmware, workspace one, Citrix, Soti, mobile Iron (ivanti), HMS

**G. Software Monitoring**

Brand: Solarwinds, PRTG, Managed Engine, Dynatrace, BMC

**H. Unified End Point Management**

Brand: Ivanti, managed engine

**I. Load Balancing**

Brand: Radware, F5

**J. SD-WAN**

Brand: Aruba Edge connect, sangfor, fortinet, Cisco, versa network

**K. IT Asset Management**

Brand: Ivanti, service now, BMC, Managed engine

---

### **Halaman 13**

**IT SOLUTION MAPPING**

**A. Tier Level 1 (Bagaimana user bisa punya infrastruktur yg lebih sederhana)**

* mandatory Solution


* infrastructure level


* environment



1. **Networking**


* Router: mengatur jaringan yg beda


* Core switch: menghubungkan jaringan yg beda


* distribution switch


Jaringan Komputer dibedakan menjadi 2: Kabel & wireless (internet media udara)



2. **HCI**: gabungan antara Server & storage, kelemahan: up scale. Solusi yg paling murah tapi kurang fleksibel up scalenya. Ibaratnya seperti laptop kl mau update belum tentu sesuai. Paket lengkap sudah ada virtualisasinya.



**B. Tier Level 2 (Solusi yg harus dipakai untuk Compliance)**

* Nice to have Solutions / product


* Security Solutions


* Solutions for comply any regulations


(Regulasi: BI (Bank Indonesia), OJK (Otoritas Jasa Keuangan), UU PDP No 27 th 2022 Bank, Internasional: PCI DSS (Kartu kredit))


FSI: industry yg berkaitan dengan pendanaan keuangan, contohnya: Adira, FIF, ACC, Suzuki Finance, ovo, Go Pay, Dana, Kredivo



1. **Next Generation Firewall**

Firewall biasanya portnya lebih sedikit dibanding dgn switch.



---

### **Halaman 14**

Perangkat yg bisa saling menggantikan (firewall & router). Orang lebih baik memakai firewall karena tak terlalu rumit.

Asumsi: Gerbang rumah. Pertahanan pertama pasti punya access policy (keluar masuk aksesnya seperti apa). Membatasi masuk keluar. Terintegrasi oleh active directory: contoh memakai password seperti email jd ga gampang/sembarang diakses oleh orang lain.

* Cara membaca gartner: Keatas semakin laku, ke kanan semakin canggih.


* Beberapa firewall ada yg sudah tersedia SD-WAN nya (akan terhubung satu sama lain dgn firewall bisa saling terhubung antar cabang). Biasanya fitur tambahan di firewall ada SD-WAN & VPN. Kalau SD-WAN nya tak dpt bnyk menampung maka bisa beli terpisah.



2. **Data Loss Prevention (DLP)**

-> Data tdk bisa keluar & tdk bisa diprint


Brand: Forcepoint, Symantec, Digital Guardian


Policy / pengendaliannya dpt bermacam. Yang paling banyak dilindungi DLP: NIK, NO HP, NPWP, NO REK, Alamat. kalau mengandung lebih dari ... data tak akan bisa keluar dari laptop baik di download, diprint, atau diupload di WA / email, nantinya akan mendapatkan pop up / notif larangan.



* Phising: hacker menyebarkan pesan secara random biasanya berupa URL


* Malware yg bisa merusak system kita


* Vulnerability: celah keamanan



3. **Endpoint Protection Platform (computer, laptop)**

Brand: Trend micro, Kaspersky, Crowdstrike



* Anti Virus: Serangan ransomware & membunuh virus tsb / dikarantinakan.


* NGAV (Next Generation Anti Virus): Pencegahan ancaman sebelum memasuki jaringan


* EDR: mencegah saat serangan terjadi tergantung Policy. Menutup koneksi EDP langsung terisolasi



---

### **Halaman 15**

Metode anti virus:

* Metode Prevention


-> Indicator Of Compromise (IOC): membutuhkan update signature knowledge terhadap virus selalu diupdate. Ciri fisik berdasarkan tampilan. Kelemahan: Zero day attack (virus yg terjadi sebelum terupdate) tdk efektif.


-> Indicator Of Attack (IOA): melihat virus berdasarkan perilaku. Tak ada fitur scanning. Ketika virus itu melakukan serangan, baru diserang IOA.



4. **Security Gateway**: Khusus untuk email.


Biasanya yg menggunakannya Banking/FSI untuk compliance PCI DSS dan ISO.


Fitur:

* filter spam


* deteksi phising


* analisis malware


* enkripsi e-mail


* quarantine



**PERBANDINGAN BRAND END POINT (EDP)**

① **Crowdstrike**

* Keunggulan:
* platform berbasis cloud (crowdstrike Falcon) yg menyediakan solusi EDR & NGAV.


* Sangat kuat dalam threat intelligence & memiliki fitur threat hunting melalui crowdstrike Falcon overwatch.


* Memiliki kemampuan deteksi ancaman secara real-time dgn waktu respons yg cepat.


* skalabilitas tinggi dan mudah diintegrasikan dlm berbagai ukuran organisasi


* fokus pada machine learning & AI untuk detect ancaman.




* Kekurangan:
* Biaya cenderung lebih tinggi dibanding competitor.





② **Trellix (sebelumnya Mc. Afee Enterprise & FireEye)**

* Keunggulan:
* Dikenal dgn solusi yg kuat untuk threat detection, endpoint security, dan XDR (Extended Detection & Response)


* Mengintegrasikan teknologi FireEye (setelah merger) untuk kemampuan deteksi ancaman yg lebih baik.


* Memiliki Solusi DLP & intrusion prevention system (IPS) yg terintegrasi.


* Dukungan kuat untuk incident response & forensik




* Kekurangan:
* Platform yg lebih kompleks, yg bisa membutuhkan lebih banyak sumber daya IT untuk mengelola.


* Beberapa pengguna melaporkan bahwa dashboard & user interface bisa membingungkan & kurang intuitif.





③ **SentinelOne**

* Keunggulan:
* menawarkan autonomous endpoint protection dan kemampuan AI/ML-driven detection


* Platform singularity menyediakan endpoint protection, detection, dan response dalam satu solusi.


* dikenal dgn kemampuan rollback feature yg memungkinkan sistem kembali ke kondisi sebelum infeksi.





---

### **Halaman 16**

*(Lanjutan SentinelOne)*

* otomatisasi tinggi & Pengelolaan tanpa agen (agentless management) sehingga cocok untuk organisasi dgn tim IT yg kecil.


* Kemampuan real-time threat hunting & response tanpa memerlukan intervensi manusia.


* Kekurangan:
* Tdk memiliki fitur yg seluas beberapa pesaing dlm hal threat intelligence dan mitigasi ancaman global.


* Biaya lisensi bisa tinggi, terutama untuk fitur premium seperti full XDR





④ **Trend Micro**

* Keunggulan:
* Dikenal dgn solusi antivirus yg andal serta produk deep security Apex one untuk endpoint protection.


* Kuat dalam threat intelligence & perlindungan multi-layered, termasuk kemampuan melindungi aplikasi cloud, server, dan beban kerja hybrid


* Fokus pada zero trust & XDR


* Solusi cloud one memberikan perlindungan yg komprehensif untuk lingkungan cloud & hybrid cloud




* Kekurangan:
* user interface terkadang dianggap kurang modern & perlu peningkatan


* pengaturan awal bisa kompleks untuk pengguna yg baru menggunakan produk Trend Micro





⑤ **Sophos**

* Keunggulan:
* menawarkan endpoint protection yg terjangkau dgn fitur antivirus, firewall, email security, dan Server protection


* Platform sophos Intercept X memiliki fitur EDR & anti ransomware yg efektif dgn deteksi berbasis deep learning


* sophos Central sebagai dashboard terpadu untuk mengelola keamanan dari satu platform dgn mudah.


* synchronized Security memberikan integrasi yg lebih baik antar produk keamanan sophos termasuk firewall & end point.





---

### **Halaman 17**

**LANJUTAN PERBANDINGAN BRAND EDP**

Dari Sisi Harga:

① Crowdstrike: kisaran harga Rp 950.000 - Rp 1.000.000 / end point

② SentinelOne: Kisaran harga Rp 750.000 - Rp 850.000 / end point

③ Trellix | hampir sama, kisaran harga Rp 350.000 - Rp 500.000 / end point

④ Trend Micro |

⑤ Kaspersky | hampir sama, kisaran harga Rp 250.000 / end point

⑥ Sophos |

**Keunggulan Crowdstrike**

* **Single Agent dan Lightweight**: cukup satu single agent. Jadi sekali install hanya 1 agent, kalau ada update, penambahan fitur, perubahan policy tidak perlu install agentnya lagi. Instalasi bisa untuk selamanya jadi tidak perlu reboot (single agent)


Agent tidak memberatkan performance server / laptop, karena pengguna memori hanya 1%; RAM Cuma 12 MB. Untuk analisa ancaman dibebankan di cloud bukan pada agent. Tidak ada update signature (scanning). Sudah full IOA (Indicator of Attack) memahami ancaman berdasarkan behavior. Deploymentnya SAAS fully di cloud, management console / dashboard crowdstrike full cloud jadi tak perlu menyiapkan environmentnya lagi untuk dashboard crowdstrike (lightweight)


* **Mengapa Cloud?** -> Tanggung Jawab management crowdstrike dalam hal melindungi . User tak perlu memikirkan environmentnya / manajemennya.


* Jika Banking/FSI berkata "Kita gak boleh cloud" crowdstrike tdk menyimpan data pribadi / file / data nasabah lainnya. yang disimpan pada cloud hanya data telemetry dari laptop (data aktivitas yg dilakukan oleh manusia / tidak). Untuk file/data penting crowdstrike tdk perlu & tdk peduli.




* **Bundle Falcon Complete** (paling lengkap & mahal), memberikan gratis SOC (Monitoring) yg langsung dimonitor oleh orang Crowdstrike melalui cloud. Amit-amit solusi ini jebol kita beri warranty 2 Juta USD . Jika pembelian Falcon Pro (Tipe paling rendah) -> machine perlindungannya sama kuatnya dgn yg paling mahal. Bedanya hanya bagian managementnya saja.



---

### **Halaman 18**

* **Airgapped Offline**: masih bisa terlindungi .


* **Semi DLP**: tdk sedeep DLP yg real. Namun hanya membatasi jenis file saja.


* Anti Virus yang lainnya masih menggunakan signature base (memahami maling hanya dari pengetahuan yg diketahui) dan beberapa masih semi IOA. Jadi masih ada scanning.


* kalau user bilang: "tapi ngeri ah kalau dideploy dicloud." Justru lebih ngeri jika di deploy pada on-prem karena tak terjamin keamanannya.


* kalau crowdstrike semua analisa dilakukan oleh management crowdstrike sendiri


* kalau brand lainnya lakukan analisa di agentnya & membuat end point lemot



perusahaan yang menggunakan crowdstrike kita:

Mandiri Utama Finance; Hibank; Bank Mega Syariah; Pintu Kemana Saja

**yang harus diobrolkan terkait Crowdstrike:**

* **Content email**: Global threat report


Key finding: 75% serangan cyber modern bebas dari malware, dan sering kali melibatkan pencurian kredensial.


* **Pengenalan CS Cepat**: bagian dari fitur utama kami adalah misal: Anda dapat mengimplementasikan fungsi seperti antivirus generasi berikutnya, EDR, manajemen aset TI, dan manajemen kerentanan hanya dgn menginstall satu agen dititik akhir. Tidak diperlukan pembaruan tanda tangan setiap hari.


* **Mengatasi Persona**: Karena saya melihat anda adalah manajer IT, saya jadi bertanya-tanya apakah perusahaan anda menggunakan solusi apapun untuk mengatasi hal ini? Alat keamanan siber apa yang mereka gunakan? Ada inisiatif keamanan siber?


* **Respon pelanggan**: Jika menggunakan existing, tanyakan tentang pengalamannya. Apakah ada kendala? visibilitas? Solusi AV lama yg memerlukan pembaruan tanda tangan untuk mengatasi malware baru.



---

### **Halaman 19**

Lanjutan Respon pelanggan: Battlecard yg berfokus pada produk: Mis: rentan terhadap serangan identitas

**EDR, NDR, XDR, MDR (Perbandingannya)**

*(Diagram alur dan skema koneksi jaringan):*

ISP -> core switch -> Firewall (primer)

Switch distribution -> NDR (sensor mirroring) -> Port 123

Laptop / server -> EDR (sekunder)

MDR tau -> harus diberitahukan kpd firewall -> supaya hal/kejadian yg sama tak akan terjadi lagi. (Serangannya ditahan, nanti langsung diblock 123, firewall mati)

* **Anti Virus / EDR**: Dulu adanya SMADAV, hanya diinstall kemudian direport sebulan sekali oleh user itu bisa.


* **NGAV**: Next Generation Anti Virus, Management, Configuration in single dashboard, sudah dibantu report. NGAV jaman skrg pasti ada IOA & IOC (Fitur utama NGAV).


* **EDR**: Response to other solutions. hanya crowdstrike: Deep analytic dilakukan di management . Data telemetry: data telemetry itu data dari endpoint , kapan laptop nyala/mati. Terintegrasi dgn solusi lain: identity dsb. Single agent & one time installation. Lightweight: file size kecil 120 MB, ga ada scanning, file proses kecil, deep analytic in cloud.


* **NDR**: Menentukan EDR / tdknya.


* **MDR**: minimal punya SIEM & Firewall, email security.



---

### **Halaman 20**

**Pitching Ke Customer:**

* User yg pakai ada berapa?


* existing anti virus apa?


* ada masalah gak terkait anti virus existing?


* firewall apa?



**MDR (Managed Detection & Response)**

Brand: Crowdstrike, Palo Alto, Sophos

Syarat adanya MDR:

* punya SIEM


* main hour 24x7


* SOC : hanya memantau saja


* detection & response


-> sumber: EDR, NDR, XDR, Firewall, Network


* MDR: harus ada yg diinstall:


a. SIEM


b. Firewall


c. Vulnerability scanner


d. IDS / IPS / APT


e. End point / anti virus


f. Other existing security point


*(MDR harus punya minimal 2)*


**NDR**

* Menutup celah keamanan


* Use case yg diharapkan: pengembangan IT disisi network


* Otomatisasi bila terjadi insiden: mengubah konfigurasi, menghentikan bottleneck (tergantung policy)


Brand: Extrahop, Darktrace, sangfor



**XDR (extended detection & response)**

Turunan EDR yg bisa terintegrasi dgn solusi lainnya.

X = any (apapun solusinya)

open / cyber stellar: SIEM, NDR, EDR, MDR, etc. XDR selama bisa diintegrasikan ke EDR & NDR.

---

*(Kolom Bagian Kanan Halaman 20)*

**ZTNA (Zero Trust Network Access)**

Konsep solusi yg digadang menggantikan vpn 

ketika user dari luar akan mengakses server lokal kita, harus menggunakan vpn sehingga mempermudah pekerjaan diluar kantor.

*(Ilustrasi tunneling VPN: User -> ISP -> ISP -> Firewall Publik -> Agent: forticlient -> server local)*

yg dibutuhkan: IP Public, Username, password, MFA

Dalam firewall pasti ada vpn, vpn terkenal cloudflare

Ilustrasi vpn untuk yg situs diblokir: ISP -> VPN -> Reddit (mengakses website yg diblokir)

* ZTNA <license / user / device / end point + aplikasi (aset)>


* dimanage tiap aplikasi


* Agent / agentless


* Tak hanya credential, tapi ada laptop user + lokasi + biometric + MFA (konsep bisa login ZTNA)


-> login portal, sesudah masuk nanti bisa akses aplikasi yg udah diberi & bisa ditracking / tdk


-> lokasi: kalau lokasi diluar jkt mau ada credential / laptopnya aja tetep tak bisa diakses.


* Fitur yg ada di NGFW / beberapa brand: Palo Alto, Fortinet gratis, ZTNA sendiri itu dari SAAS & berbayar namanya Zscaler (via cloud)


* Targetnya aplikasi / Aset (keyword) (banyak aplikasi SAAS tp ga mau SSO, tp mau di manage identity dan mau tracking activity dari aplikasi yg ada di SAAS)



Contoh integrasi: SINTA, SICTI, workplace User, Gsuite, windows local, Linux, ino-computradetech.com (private cloud hny org tertentu)

* **CASB**: hanya bisa diakses user nya saja; public cloud <GCP, AWS Azure,>


* **SASE**: ZTNA + CASB + Firewall as a service + secure web gateway



---

### **Halaman 21**

**Lanjutan IAM **

Pendekatan untuk mengelola identitas digital pengguna & hak akses mereka ke sistem aplikasi dan data. IAM memastikan bahwa hanya pengguna yg berwenang dpt mengakses sumber daya yg dibutuhkan.

**Komponen utama IAM:**

* otentikasi


* otorisasi


* Pemberian akses berdasarkan peran


* provisioning: proses pembuatan, modifikasi & akun pengguna secara otomatis


* governance: menetapkan kebijakan & prosedur untuk mengelola identitas & akses



**Contoh Penggunaan IAM:**

* sistem perusahaan: digunakan untuk mengelola akses karyawan ke sistem perusahaan seperti e-mail, aplikasi bisnis, dan database


* cloud computing: mengelola akses pengguna ke layanan cloud seperti Amazon Web Services (AWS), Microsoft Azure, dan Google Cloud Platform


* situs web: mengelola pendaftaran pengguna, login, dan akses otorisasi ke konten situs web