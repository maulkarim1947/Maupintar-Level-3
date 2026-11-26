import { OptionKey, Question } from '../types';

interface RawQuestion {
  n: number;
  passage?: string;
  passageTitle?: string;
  q: string;
  a: string;
  b: string;
  c: string;
  d: string;
}

function buildQuestions(prefix: string, items: RawQuestion[], keys: OptionKey[]): Question[] {
  return items.map((item, idx) => ({
    id: `${prefix}-${item.n}`,
    number: item.n,
    passage: item.passage,
    passageTitle: item.passageTitle,
    prompt: item.q,
    options: {
      A: item.a,
      B: item.b,
      C: item.c,
      D: item.d,
    },
    correctAnswer: keys[idx],
  }));
}

const PASSAGE_MTK =
  'Toko buku "Cerdas" memiliki persediaan 425 buku tulis. Pada hari Senin, toko menerima kiriman lagi sebanyak 180 buku tulis. Pada hari Selasa, terjual 95 buku tulis. Selain itu, toko juga menjual pita sepanjang 3 meter dan memiliki sekarung beras seberat 2 kilogram.';

const KEYS_MTK: OptionKey[] = [
  'B', 'A', 'B', 'C', 'B', 'B', 'B', 'C', 'A', 'B',
  'B', 'A', 'B', 'A', 'B', 'C', 'B', 'B', 'A', 'B',
  'B', 'A', 'A', 'A', 'C', 'C', 'B', 'C', 'A', 'A',
];

export const QUESTIONS_MATEMATIKA: Question[] = buildQuestions(
  'mtk',
  [
    { n: 1, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_MTK, q: 'Banyak buku tulis di toko setelah menerima kiriman pada hari Senin adalah ....', a: '505 buku', b: '605 buku', c: '615 buku', d: '595 buku' },
    { n: 2, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_MTK, q: 'Dari jumlah buku setelah kiriman hari Senin, setelah terjual 95 buku pada hari Selasa, sisa buku tulis adalah ....', a: '510 buku', b: '520 buku', c: '410 buku', d: '430 buku' },
    { n: 3, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_MTK, q: 'Panjang pita 3 meter jika diubah ke satuan sentimeter (cm) adalah ....', a: '30 cm', b: '300 cm', c: '3.000 cm', d: '103 cm' },
    { n: 4, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_MTK, q: 'Berat sekarung beras 2 kilogram jika diubah ke satuan gram (g) adalah ....', a: '20 g', b: '200 g', c: '2.000 g', d: '20.000 g' },
    { n: 5, q: 'Nama bilangan dari 805 adalah ....', a: 'delapan ratus lima puluh', b: 'delapan ratus lima', c: 'delapan puluh lima', d: 'delapan ribu lima' },
    { n: 6, q: 'Lambang bilangan dari "enam ratus dua puluh satu" adalah ....', a: '612', b: '621', c: '261', d: '602' },
    { n: 7, q: 'Pada bilangan 752, angka 5 menempati nilai tempat ....', a: 'ratusan', b: 'puluhan', c: 'satuan', d: 'ribuan' },
    { n: 8, q: 'Nilai angka 7 pada bilangan 752 adalah ....', a: '7', b: '70', c: '700', d: '7.000' },
    { n: 9, q: 'Bentuk panjang dari 634 adalah ....', a: '600 + 30 + 4', b: '60 + 300 + 4', c: '600 + 40 + 3', d: '6 + 30 + 40' },
    { n: 10, q: 'Tanda perbandingan yang tepat untuk mengisi titik-titik pada 456 ... 389 adalah ....', a: '<', b: '>', c: '=', d: '+' },
    { n: 11, q: 'Tanda yang tepat untuk membandingkan 278 ... 312 adalah ....', a: '>', b: '<', c: '=', d: '-' },
    { n: 12, q: 'Urutan bilangan 340, 125, 510, 280 dari yang terkecil adalah ....', a: '125, 280, 340, 510', b: '510, 340, 280, 125', c: '125, 340, 280, 510', d: '280, 125, 340, 510' },
    { n: 13, q: 'Hasil dari 345 + 278 adalah ....', a: '613', b: '623', c: '523', d: '633' },
    { n: 14, q: 'Hasil dari 87 - 39 adalah ....', a: '48', b: '58', c: '52', d: '46' },
    { n: 15, q: 'Hasil dari 7 x 8 adalah ....', a: '54', b: '56', c: '64', d: '48' },
    { n: 16, q: 'Hasil dari 56 : 7 adalah ....', a: '6', b: '7', c: '8', d: '9' },
    { n: 17, q: 'Andi punya 15 kelereng, lalu mendapat 8 lagi. Kalimat matematikanya adalah ....', a: '15 - 8 = 7', b: '15 + 8 = 23', c: '15 x 8 = 120', d: '15 : 8 = 2' },
    { n: 18, q: 'Siti punya 30 permen, lalu diberikan kepada adiknya 12 permen. Sisa permen Siti adalah ....', a: '42', b: '18', c: '22', d: '12' },
    { n: 19, q: 'Nilai yang tepat untuk mengganti titik-titik pada ... + 15 = 40 adalah ....', a: '25', b: '55', c: '15', d: '35' },
    { n: 20, q: 'Nilai yang tepat untuk mengganti titik-titik pada 28 + ... = 50 adalah ....', a: '28', b: '22', c: '78', d: '32' },
    { n: 21, q: 'Nilai yang tepat untuk mengganti titik-titik pada ... - 12 = 30 adalah ....', a: '18', b: '42', c: '30', d: '22' },
    { n: 22, q: 'Nilai yang tepat untuk mengganti titik-titik pada 65 - ... = 40 adalah ....', a: '25', b: '105', c: '35', d: '15' },
    { n: 23, q: 'Alat ukur yang tepat untuk mengukur panjang sebuah pensil dalam sentimeter adalah ....', a: 'penggaris', b: 'timbangan badan', c: 'timbangan industri', d: 'jam dinding' },
    { n: 24, q: '1 cm sama dengan ....', a: '10 mm', b: '100 mm', c: '1.000 mm', d: '5 mm' },
    { n: 25, q: '2 km sama dengan ... m.', a: '20 m', b: '200 m', c: '2.000 m', d: '20.000 m' },
    { n: 26, q: '1 kg sama dengan ....', a: '10 g', b: '100 g', c: '1.000 g', d: '10.000 g' },
    { n: 27, q: '1 kuintal sama dengan ....', a: '10 kg', b: '100 kg', c: '1.000 kg', d: '50 kg' },
    { n: 28, q: '1 ton sama dengan ....', a: '10 kg', b: '100 kg', c: '1.000 kg', d: '500 kg' },
    { n: 29, q: '5 kg + 2.000 g sama dengan ... kg.', a: '7 kg', b: '3 kg', c: '5.002 kg', d: '2.005 kg' },
    { n: 30, q: '400 cm sama dengan ... m.', a: '4 m', b: '40 m', c: '400 m', d: '14 m' },
  ],
  KEYS_MTK
);

const PASSAGE_PAI =
  'Pada bulan Ramadan, Faris berpuasa dengan penuh semangat. Sebelum terbit fajar ia makan sahur, lalu berniat puasa karena Allah Swt. Di sekolah, teman-temannya bermain dan makan di kantin saat istirahat. Faris tetap menahan diri hingga waktu berbuka tiba. Ia yakin Allah Swt. Maha Pemberi (Al-Wahhab) dan selalu memberikan yang terbaik sehingga ia berprasangka baik kepada Allah Swt.';

const KEYS_PAI: OptionKey[] = [
  'A', 'B', 'A', 'A', 'A', 'A', 'A', 'A', 'B', 'A',
  'A', 'B', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A',
  'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A',
];

export const QUESTIONS_PAI: Question[] = buildQuestions(
  'pai',
  [
    { n: 1, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_PAI, q: 'Surah Al-Alaq ayat 1–5 merupakan wahyu yang pertama kali turun kepada Nabi Muhammad saw. di ....', a: 'Gua Hira', b: 'Gua Tsur', c: 'Kota Madinah', d: 'Bukit Uhud' },
    { n: 2, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_PAI, q: 'Perintah pertama yang terdapat pada awal Surah Al-Alaq adalah ....', a: 'berpuasa', b: 'membaca (iqra)', c: 'bersedekah', d: 'berperang' },
    { n: 3, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_PAI, q: 'Sikap Faris yang tetap menahan diri tidak makan dan minum saat berpuasa sampai waktu berbuka merupakan pelaksanaan ....', a: 'rukun puasa', b: 'hal yang membatalkan puasa', c: "su'uzan", d: 'sifat mustahil Allah' },
    { n: 4, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_PAI, q: 'Keyakinan Faris bahwa Allah Swt. selalu memberikan yang terbaik disebut ....', a: 'husnuzan kepada Allah Swt.', b: "su'uzan kepada sesama", c: 'sombong', d: 'lupa diri' },
    { n: 5, q: 'Surah Al-Alaq terdiri atas 5 ayat pertama yang diturunkan dan menerangkan bahwa Allah menciptakan manusia dari ....', a: 'segumpal darah', b: 'cahaya api', c: 'air hujan', d: 'batu karang' },
    { n: 6, q: 'Arti dari "Alladzi \'allama bil-qalam" pada Surah Al-Alaq ayat 4 adalah ....', a: 'Yang mengajar (manusia) dengan pena', b: 'Bacalah dengan nama Tuhanmu', c: 'Dia menciptakan dari segumpal darah', d: 'Tuhanmulah Yang Maha Pemurah' },
    { n: 7, q: "Hukum bacaan yang perlu diperhatikan saat membaca Al-Qur'an agar tartil antara lain ....", a: 'qalqalah, mad, dan idgham', b: 'menyanyi dan berteriak', c: 'membaca terburu-buru', d: 'mengabaikan harakat' },
    { n: 8, q: 'Sifat yang pasti dimiliki Allah Swt. dan tidak mungkin tidak ada disebut sifat ....', a: 'wajib', b: 'mustahil', c: 'jaiz', d: 'sunah' },
    { n: 9, q: 'Sifat yang mustahil dimiliki Allah Swt. disebut sifat ....', a: 'wajib', b: 'mustahil', c: 'jaiz', d: 'fardu' },
    { n: 10, q: 'Sifat jaiz bagi Allah Swt. artinya Allah boleh berbuat sesuatu atau meninggalkannya sesuai ....', a: 'kehendak-Nya', b: 'perintah manusia', c: 'keinginan makhluk', d: 'aturan permainan' },
    { n: 11, q: 'Asmaul Husna "Al-Wahhab" memiliki arti ....', a: 'Yang Maha Pemberi', b: 'Yang Maha Besar', c: 'Yang Maha Mengetahui', d: 'Yang Maha Melihat' },
    { n: 12, q: 'Pengamalan dari Asmaul Husna "Al-Kabir" (Yang Maha Besar) dalam kehidupan sehari-hari adalah ....', a: 'bersikap sombong dan meremehkan orang lain', b: 'merasa kecil di hadapan Allah dan tidak sombong', c: 'tidak mau berbagi dengan teman', d: 'marah saat dinasihati' },
    { n: 13, q: 'Lawan dari sikap husnuzan (berprasangka baik) adalah ....', a: "su'uzan", b: 'sabar', c: 'syukur', d: 'jujur' },
    { n: 14, q: 'Berprasangka baik kepada diri sendiri ditunjukkan dengan sikap ....', a: 'percaya diri dan terus berusaha dengan sungguh-sungguh', b: 'selalu merasa gagal sebelum mencoba', c: 'menuduh teman mencuri tanpa bukti', d: 'putus asa saat menghadapi soal sulit' },
    { n: 15, q: 'Pengertian puasa menurut syariat Islam adalah menahan diri dari makan, minum, dan hal yang membatalkan puasa mulai dari ....', a: 'terbit fajar sampai terbenam matahari', b: 'pagi sampai siang saja', c: 'sore sampai malam hari', d: 'setelah magrib sampai subuh' },
    { n: 16, q: 'Berikut ini yang termasuk syarat puasa adalah ....', a: 'Islam, berakal, dan baligh', b: 'makan dengan sengaja', c: 'muntah dengan sengaja', d: 'tidur sepanjang hari' },
    { n: 17, q: 'Amalan yang termasuk sunah puasa antara lain ....', a: 'makan sahur dan menyegerakan berbuka saat waktunya', b: 'makan dan minum di siang hari', c: 'menunda berbuka hingga larut malam', d: 'marah kepada teman' },
    { n: 18, q: 'Hal berikut yang dapat membatalkan puasa adalah ....', a: 'makan dan minum dengan sengaja di siang hari', b: 'lupa makan lalu segera berhenti dan melanjutkan puasa', c: 'mandi untuk menyegarkan badan', d: 'menggosok gigi sebelum zuhur' },
    { n: 19, q: 'Orang yang diperbolehkan tidak berpuasa antara lain ....', a: 'musafir (orang yang sedang bepergian jauh) dan orang sakit', b: 'orang sehat yang malas berpuasa', c: 'orang yang sengaja tidak mau berpuasa', d: 'anak yang sudah baligh dan sehat' },
    { n: 20, q: 'Hikmah berpuasa bagi kehidupan kita antara lain ....', a: 'melatih kesabaran dan menumbuhkan empati', b: 'membuat tubuh menjadi boros makanan', c: 'menjauhkan diri dari ibadah', d: 'membuat kita mudah marah' },
    { n: 21, q: 'Kondisi geografis wilayah Arab Pra-Islam didominasi oleh ....', a: 'padang pasir dan iklim panas', b: 'salju abadi sepanjang tahun', c: 'hutan hujan tropis lebat', d: 'pegunungan es' },
    { n: 22, q: 'Kepercayaan masyarakat Arab Pra-Islam sebelum datangnya Islam umumnya adalah ....', a: 'menyembah berhala', b: 'menyembah matahari saja', c: 'tidak percaya Tuhan sama sekali', d: 'menyembah pohon beringin' },
    { n: 23, q: 'Nabi Muhammad saw. lahir di Kota Mekah pada tanggal ....', a: '12 Rabiul Awal Tahun Gajah', b: '17 Ramadan', c: '10 Muharam', d: '1 Syawal' },
    { n: 24, q: 'Gelar "Al-Amin" yang diberikan kepada Nabi Muhammad saw. sejak remaja artinya ....', a: 'yang terpercaya', b: 'yang paling kaya', c: 'yang paling cepat berlari', d: 'yang pemarah' },
    { n: 25, q: 'Setelah kakeknya Abdul Muthalib wafat, Nabi Muhammad saw. diasuh oleh pamannya yang bernama ....', a: 'Abu Thalib', b: 'Abu Jahal', c: "Fir'aun", d: 'Abrahah' },
    { n: 26, q: 'Doa dan pujian kepada Nabi Muhammad saw. disebut ....', a: 'shalawat', b: 'teka-teki', c: 'pantun jenaka', d: 'pidato' },
    { n: 27, q: 'Nyanyian atau lagu religius yang berisi shalawat dan kisah Nabi disebut ....', a: 'qasidah', b: 'dongeng', c: 'komik', d: 'poster' },
    { n: 28, q: 'Pantun atau puisi yang berisi pujian kepada Allah dan Rasul-Nya disebut ....', a: 'syair', b: 'peta', c: 'jadwal', d: 'catatan' },
    { n: 29, q: 'Ketika mendapat nikmat dari Allah Swt., sikap husnuzan yang tepat adalah ....', a: 'bersyukur dan memanfaatkannya untuk kebaikan', b: 'mengeluh dan merasa kurang', c: 'menyembunyikan nikmat dengan sombong', d: 'melupakan pemberi nikmat' },
    { n: 30, q: 'Membaca Surah Al-Alaq mengingatkan kita tentang pentingnya ....', a: 'menuntut ilmu pengetahuan dan belajar', b: 'bermalas-malasan di kelas', c: 'mengejek teman yang belum bisa', d: 'melupakan pelajaran' },
  ],
  KEYS_PAI
);

const PASSAGE_PKN =
  'Di kelas 3 SD, ada siswa bernama Bagas yang gemar bermain sepak bola dan Lani yang suka menggambar. Meskipun hobi dan asal daerah mereka berbeda, keduanya saling menghargai dan berteman dengan rukun. Saat jam pelajaran berlangsung, mereka mematuhi kesepakatan kelas seperti mengangkat tangan sebelum berbicara dan membuang sampah pada tempatnya.';

const KEYS_PKN: OptionKey[] = [
  'A', 'A', 'A', 'B', 'A', 'A', 'A', 'A', 'A', 'A',
  'A', 'A', 'C', 'A', 'A', 'A', 'A', 'A', 'A', 'A',
  'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A',
];

export const QUESTIONS_PKN: Question[] = buildQuestions(
  'pkn',
  [
    { n: 1, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_PKN, q: 'Perbedaan kegemaran antara Bagas dan Lani pada bacaan di atas menunjukkan adanya ....', a: 'keragaman identitas / hobi', b: 'permusuhan antar teman', c: 'pelanggaran aturan sekolah', d: 'ketidakadilan di kelas' },
    { n: 2, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_PKN, q: 'Sikap yang ditunjukkan Bagas dan Lani terhadap perbedaan adalah ....', a: 'saling menghargai dan berteman rukun', b: 'saling mengejek kesukaan masing-masing', c: 'tidak mau berbicara satu sama lain', d: 'memaksa teman menyamakan hobi' },
    { n: 3, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_PKN, q: 'Contoh kesepakatan kelas yang disebutkan pada bacaan adalah ....', a: 'mengangkat tangan sebelum berbicara', b: 'makan makanan ringan saat guru menerangkan', c: 'datang terlambat saat upacara', d: 'mencoret-coret meja kelas' },
    { n: 4, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_PKN, q: 'Membuang sampah pada tempatnya di kelas bermanfaat agar kelas menjadi ....', a: 'kotor dan berbau', b: 'bersih dan nyaman untuk belajar', c: 'penuh sampah berserakan', d: 'sempit dan gelap' },
    { n: 5, q: 'Identitas diri adalah ciri khas yang membedakan seseorang dengan orang lain, misalnya ....', a: 'nama, jenis kelamin, usia, dan hobi', b: 'warna awan di langit', c: 'jumlah bintang di malam hari', d: 'harga buku di toko' },
    { n: 6, q: 'Jenis kelamin manusia terdiri atas ....', a: 'laki-laki dan perempuan', b: 'tinggi dan pendek', c: 'kurus dan gemuk', d: 'besar dan kecil' },
    { n: 7, q: 'Kegiatan yang kita sukai dilakukan pada waktu luang disebut ....', a: 'hobi', b: 'sanksi', c: 'pelanggaran', d: 'tagihan' },
    { n: 8, q: 'Di Indonesia terdapat banyak perbedaan suku, agama, bahasa, dan budaya. Sikap kita sebaiknya ....', a: 'menghormati dan menjadikannya kekayaan bangsa', b: 'menganggap budaya sendiri paling hebat', c: 'menjauhi teman yang berbeda suku', d: 'meremehkan bahasa daerah lain' },
    { n: 9, q: 'Tempat tinggal kita seperti rumah, desa atau kelurahan, dan kabupaten atau kota merupakan bagian dari ....', a: 'NKRI (Negara Kesatuan Republik Indonesia)', b: 'halaman sekolah saja', c: 'taman bermain', d: 'ruang tamu' },
    { n: 10, q: 'Lingkungan sekitar tempat tinggal kita dapat berupa ....', a: 'tetangga, jalan, sungai, sawah, atau pasar', b: 'hanya ruang angkasa', c: 'dasar samudra terdalam', d: 'kutub utara saja' },
    { n: 11, q: 'Manfaat adanya aturan di sekolah adalah ....', a: 'membuat sekolah tertib, aman, dan nyaman', b: 'membuat siswa saling bertengkar', c: 'membingungkan seluruh warga sekolah', d: 'menghambat kegiatan belajar' },
    { n: 12, q: 'Contoh aturan masuk sekolah yang baik adalah ....', a: 'datang sebelum bel masuk berbunyi', b: 'datang saat jam istirahat selesai', c: 'bolos tanpa keterangan', d: 'pulang sebelum jam pelajaran habis' },
    { n: 13, q: 'Sikap berikut yang bertentangan dengan aturan sekolah adalah ....', a: 'memakai seragam sesuai jadwal', b: 'mengerjakan tugas tepat waktu', c: 'membuang sampah sembarangan', d: 'menghormati guru' },
    { n: 14, q: 'Kesepakatan kelas dibuat melalui cara ....', a: 'musyawarah bersama seluruh warga kelas', b: 'paksaan satu orang saja', c: 'sembunyi-sembunyi tanpa diketahui teman', d: 'melanggar aturan yang sudah ada' },
    { n: 15, q: 'Langkah setelah usulan kesepakatan kelas disepakati bersama adalah ....', a: 'menempelkan kesepakatan di dinding kelas dan melaksanakannya', b: 'merobek kertas kesepakatan', c: 'melupakannya setelah ditulis', d: 'menyembunyikannya di laci' },
    { n: 16, q: 'Contoh sanksi ringan yang mendidik atas pelanggaran kesepakatan kelas adalah ....', a: 'teguran, membersihkan kelas, atau meminta maaf', b: 'memukul teman yang melanggar', c: 'mengeluarkan teman dari kelas selamanya', d: 'merusak barang milik teman' },
    { n: 17, q: 'Berikut ini yang merupakan hak anak di rumah adalah ....', a: 'mendapat kasih sayang, makanan, dan pakaian', b: 'menyapu lantai setiap pagi', c: 'mencuci piring setelah makan', d: 'merapikan tempat tidur sendiri' },
    { n: 18, q: 'Berikut ini yang merupakan kewajiban anak di rumah adalah ....', a: 'membantu orang tua dan belajar dengan giat', b: 'menuntut mainan mahal setiap hari', c: 'membantah nasihat orang tua', d: 'membiarkan kamar berantakan' },
    { n: 19, q: 'Hak siswa di lingkungan sekolah antara lain ....', a: 'mendapat pelajaran dari guru dan menggunakan fasilitas sekolah', b: 'datang terlambat setiap hari', c: 'ribut saat guru menjelaskan', d: 'merusak buku perpustakaan' },
    { n: 20, q: 'Kewajiban siswa di lingkungan sekolah antara lain ....', a: 'menjaga kebersihan sekolah dan menghormati guru', b: 'mengganggu teman yang sedang belajar', c: 'tidak mengerjakan PR', d: 'membuang sampah di selokan' },
    { n: 21, q: 'Hubungan antara hak dan kewajiban yang baik adalah ....', a: 'dilaksanakan secara seimbang', b: 'hanya menuntut hak tanpa kewajiban', c: 'hanya menjalankan kewajiban saat diawasi saja', d: 'mengabaikan keduanya' },
    { n: 22, q: 'Jika kita ingin mendapat hak bermain dengan nyaman di sekolah, maka kita juga harus ....', a: 'menaati aturan bermain dan tidak menyakiti teman', b: 'merebut mainan teman dengan paksa', c: 'membuang bungkus jajanan sembarangan', d: 'bertengkar saat kalah bermain' },
    { n: 23, q: 'Mengenal karakteristik lingkungan tempat tinggal membantu kita untuk ....', a: 'mencintai dan menjaga lingkungan sekitar', b: 'mencemari sungai di dekat rumah', c: 'menebang pohon sembarangan', d: 'bersikap acuh tak acuh' },
    { n: 24, q: 'Ketika teman berbeda agama sedang beribadah, sikap kita adalah ....', a: 'menghormati dan tidak mengganggu ibadahnya', b: 'mengejek cara ibadahnya', c: 'membunyikan suara keras di dekatnya', d: 'melarangnya beribadah' },
    { n: 25, q: 'Menjaga kerukunan di lingkungan sekitar rumah dapat dilakukan dengan ....', a: 'saling menyapa tetangga dan ikut kerja bakti', b: 'menutup diri dan tidak pernah menyapa', c: 'membuang sampah ke halaman tetangga', d: 'menyebarkan kabar bohong' },
    { n: 26, q: 'Memakai seragam sekolah sesuai hari termasuk mematuhi aturan ....', a: 'berpakaian di sekolah', b: 'lalu lintas di jalan raya', c: 'di dalam bioskop', d: 'di kolam renang' },
    { n: 27, q: 'Saat guru sedang menjelaskan materi di depan kelas, sikap siswa yang tepat adalah ....', a: 'mendengarkan dengan saksama dan tidak membuat gaduh', b: 'mengobrol keras dengan teman sebangku', c: 'tidur di meja', d: 'berjalan-jalan tanpa izin' },
    { n: 28, q: 'Merapikan mainan setelah selesai bermain di rumah merupakan contoh ....', a: 'kewajiban anak di rumah', b: 'hak orang tua di kantor', c: 'aturan lalu lintas', d: 'sanksi di jalan raya' },
    { n: 29, q: 'Perbedaan adalah anugerah yang seharusnya menjadi ....', a: 'alasan untuk saling melengkapi dan menghormati', b: 'penyebab perpecahan', c: 'alasan untuk bersikap sombong', d: 'penghalang pertemanan' },
    { n: 30, q: 'Anak yang patuh aturan akan menjadi pribadi yang ....', a: 'berakhlak baik dan dihormati orang lain', b: 'sering mendapat teguran', c: 'dijauhi teman-teman', d: 'sulit bekerja sama' },
  ],
  KEYS_PKN
);

const PASSAGE_SENI =
  'Rina ingin membuat gambar cerita tentang suasana taman pada pagi hari. Pertama, ia menyiapkan pensil, penghapus, krayon, dan kertas gambar. Ia membuat sketsa tipis berbentuk lingkaran untuk matahari dan bentuk daun organik untuk pepohonan. Agar terlihat berjarak, Rina menggambar pohon di bagian depan lebih besar dan pohon yang jauh lebih kecil, lalu mewarnainya dengan warna merah dan hijau yang kontras serta selaras.';

const KEYS_SENI: OptionKey[] = [
  'A', 'A', 'B', 'A', 'A', 'A', 'A', 'A', 'A', 'A',
  'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A',
  'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A',
];

export const QUESTIONS_SENI_RUPA: Question[] = buildQuestions(
  'seni',
  [
    { n: 1, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_SENI, q: 'Alat dan bahan yang disiapkan Rina sebelum menggambar cerita antara lain ....', a: 'pensil, penghapus, krayon, dan kertas gambar', b: 'palu, paku, gergaji, dan cat tembok', c: 'sendok, garpu, piring, dan gelas', d: 'penggaris besi, jangka, dan kalkulator' },
    { n: 2, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_SENI, q: 'Bentuk matahari yang digambar Rina termasuk bentuk ....', a: 'geometris', b: 'organik bebas', c: 'garis zig-zag', d: 'tekstur nyata' },
    { n: 3, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_SENI, q: 'Bentuk daun pada pepohonan yang tidak beraturan termasuk bentuk ....', a: 'geometris', b: 'organik / bebas', c: 'persegi panjang', d: 'segitiga sama sisi' },
    { n: 4, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_SENI, q: 'Cara Rina menggambar pohon di depan lebih besar dan pohon di belakang lebih kecil bertujuan memberi ....', a: 'kesan ruang', b: 'warna hitam putih saja', c: 'garis putus-putus', d: 'tekstur kasar pada kertas' },
    { n: 5, q: 'Garis adalah goresan atau coretan yang ....', a: 'memanjang', b: 'berputar di satu titik saja', c: 'tidak terlihat mata', d: 'hanya berupa titik' },
    { n: 6, q: 'Berikut ini yang termasuk jenis-jenis garis adalah ....', a: 'lurus, lengkung, putus-putus, dan zig-zag', b: 'manis, asam, asin, dan pahit', c: 'merah, kuning, dan biru', d: 'keras, lunak, dan cair' },
    { n: 7, q: 'Bentuk geometris ditunjukkan oleh bangun ....', a: 'lingkaran, segitiga, persegi, dan oval', b: 'awan dan gumpalan asap', c: 'bentuk daun yang tidak beraturan', d: 'tubuh hewan' },
    { n: 8, q: 'Warna adalah kesan yang ditimbulkan oleh cahaya pada ....', a: 'mata', b: 'telinga', c: 'hidung', d: 'kaki' },
    { n: 9, q: 'Kelompok warna primer terdiri atas ....', a: 'merah, kuning, dan biru', b: 'hijau, oranye, dan ungu', c: 'hitam, putih, dan abu-abu', d: 'cokelat, krem, dan emas' },
    { n: 10, q: 'Warna sekunder dihasilkan dari campuran ....', a: 'dua warna primer', b: 'warna putih dan hitam saja', c: 'air dan minyak', d: 'garis lurus dan lengkung' },
    { n: 11, q: 'Campuran warna merah dan kuning menghasilkan warna sekunder ....', a: 'oranye', b: 'hijau', c: 'ungu', d: 'biru' },
    { n: 12, q: 'Campuran warna biru dan kuning menghasilkan warna sekunder ....', a: 'hijau', b: 'oranye', c: 'ungu', d: 'merah' },
    { n: 13, q: 'Campuran warna merah dan biru menghasilkan warna sekunder ....', a: 'ungu', b: 'hijau', c: 'oranye', d: 'kuning' },
    { n: 14, q: 'Prinsip warna "pengulangan" berarti ....', a: 'mengulang warna yang sama agar terlihat selaras', b: 'menghapus seluruh warna gambar', c: 'hanya memakai satu garis saja', d: 'mencampur semua warna hingga gelap' },
    { n: 15, q: 'Pasangan warna yang memberi kesan selaras dan menenangkan adalah ....', a: 'biru dan hijau', b: 'merah menyala dan kuning terang tanpa aturan', c: 'hitam pekat di seluruh bidang', d: 'warna yang bertabrakan' },
    { n: 16, q: 'Warna yang saling berlawanan agar menonjol disebut prinsip ....', a: 'kontras', b: 'buram', c: 'datar', d: 'pudar' },
    { n: 17, q: 'Struktur cerita secara umum terdiri atas bagian ....', a: 'awal, tengah, dan akhir', b: 'judul, daftar isi, dan indeks', c: 'depan, samping, dan belakang saja', d: 'pembuka dan penutup saja' },
    { n: 18, q: 'Unsur yang terdapat dalam sebuah cerita antara lain ....', a: 'tokoh, latar, alur, dan amanat', b: 'warna primer dan sekunder saja', c: 'ukuran kertas gambar', d: 'merk pensil warna' },
    { n: 19, q: 'Langkah awal saat menggambar cerita setelah menyiapkan alat dan memilih bagian cerita adalah ....', a: 'membuat sketsa tipis dengan pensil', b: 'langsung menempelkan lem', c: 'menggunting gambar menjadi kecil-kecil', d: 'melipat kertas berkali-kali' },
    { n: 20, q: 'Setelah membuat sketsa dan menebalkan garis, langkah berikutnya adalah ....', a: 'mewarnai gambar dengan rapi', b: 'merobek sketsa', c: 'menghapus seluruh gambar', d: 'menyimpan kertas tanpa diwarnai' },
    { n: 21, q: 'Prinsip komposisi "kesatuan" (unity) artinya ....', a: 'semua bagian dalam gambar menyatu dan saling berhubungan', b: 'gambar terpecah dan tidak menyatu', c: 'hanya ada satu titik kecil di pojok', d: 'warna tidak merata' },
    { n: 22, q: 'Prinsip komposisi "keseimbangan" (balance) berkaitan dengan ....', a: 'bobot visual kiri dan kanan yang terasa seimbang', b: 'gambar yang miring ke satu sisi saja', c: 'ukuran objek yang tidak teratur', d: 'gambar yang tidak selesai' },
    { n: 23, q: 'Prinsip komposisi "irama" (rhythm) ditandai dengan ....', a: 'pengulangan teratur pada bentuk, warna, atau garis', b: 'garis yang acak tanpa pola', c: 'gambar tanpa objek', d: 'warna yang pudar' },
    { n: 24, q: 'Komposisi simetris adalah komposisi yang bagian kiri dan kanannya ....', a: 'sama persis seperti cermin', b: 'sangat berbeda jauh', c: 'hanya di bagian atas saja', d: 'tidak memiliki objek utama' },
    { n: 25, q: 'Komposisi yang menempatkan objek utama tepat di tengah gambar disebut komposisi ....', a: 'sentral', b: 'acak', c: 'tersembunyi', d: 'terpotong' },
    { n: 26, q: 'Tekstur nyata adalah tekstur yang ....', a: 'dapat dirasakan langsung dengan sentuhan (kasar atau halus sungguhan)', b: 'hanya bisa dibayangkan tanpa disentuh', c: 'tidak memiliki permukaan', d: 'hanya ada pada layar' },
    { n: 27, q: 'Contoh benda dengan tekstur nyata yang terasa kasar saat disentuh adalah ....', a: 'kulit kayu atau pasir', b: 'kaca polos yang licin', c: 'gambar batu di atas kertas halus', d: 'air yang jernih' },
    { n: 28, q: 'Tekstur semu adalah tekstur yang ....', a: 'hanya terlihat oleh mata, tetapi jika diraba terasa rata atau polos', b: 'benar-benar kasar jika dipegang', c: 'terbuat dari batu asli', d: 'tidak bisa dilihat mata' },
    { n: 29, q: 'Contoh tekstur semu adalah ....', a: 'gambar permukaan batu bata pada kertas gambar yang halus', b: 'amplas sungguhan', c: 'kulit durian asli', d: 'kain karung goni' },
    { n: 30, q: 'Dalam mengolah kesan ruang, objek yang berada jauh digambar dengan ukuran ....', a: 'lebih kecil dan warna lebih samar', b: 'lebih besar dari objek di depan', c: 'menutupi seluruh gambar depan', d: 'paling tebal garisnya' },
  ],
  KEYS_SENI
);
