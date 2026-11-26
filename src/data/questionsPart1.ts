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

const PASSAGE_BI =
  'Pada hari Minggu pagi, Raka dan adiknya bermain lompat tali di halaman rumah. Raka mengayunkan tali dengan cepat, sedangkan adiknya melompat dengan gembira. Setelah selesai bermain, Raka berkata, "Tolong rapikan tali ini ke teras ya, Dik." Adik pun mengangguk dan menjawab, "Baik, Kak, terima kasih sudah mengajak bermain."';

const KEYS_BI: OptionKey[] = [
  'B', 'A', 'C', 'B', 'B', 'B', 'C', 'B', 'C', 'B',
  'D', 'B', 'B', 'B', 'B', 'B', 'B', 'A', 'B', 'B',
  'B', 'B', 'B', 'A', 'B', 'A', 'A', 'B', 'B', 'A',
];

export const QUESTIONS_BAHASA_INDONESIA: Question[] = buildQuestions(
  'bi',
  [
    { n: 1, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_BI, q: 'Ide pokok paragraf pada teks bacaan di atas adalah ....', a: 'Raka mengayunkan tali dengan sangat cepat', b: 'Raka dan adiknya bermain lompat tali di halaman rumah', c: 'Adik merapikan tali ke teras rumah', d: 'Raka mengucapkan terima kasih kepada adiknya' },
    { n: 2, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_BI, q: 'Kalimat utama pada teks bacaan tersebut terletak pada ....', a: 'kalimat pertama', b: 'kalimat kedua', c: 'kalimat ketiga', d: 'kalimat terakhir' },
    { n: 3, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_BI, q: 'Kata sifat yang terdapat pada kalimat kedua teks bacaan adalah ....', a: 'tali', b: 'halaman', c: 'gembira', d: 'mengayunkan' },
    { n: 4, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_BI, q: 'Kata ajaib yang diucapkan oleh Raka pada teks bacaan adalah ....', a: 'maaf', b: 'tolong', c: 'permisi', d: 'terima kasih' },
    { n: 5, q: 'Permainan anak tradisional yang dimainkan dengan cara melompat di kotak-kotak yang digambar di lantai disebut ....', a: 'congklak', b: 'engklek', c: 'petak umpet', d: 'ular naga' },
    { n: 6, q: 'Lawan kata dari kata sifat "rajin" adalah ....', a: 'pandai', b: 'malas', c: 'cepat', d: 'tinggi' },
    { n: 7, q: 'Kalimat pendukung berfungsi untuk ....', a: 'mengganti judul bacaan', b: 'menghapus ide pokok paragraf', c: 'menjelaskan atau memberi contoh tentang ide pokok', d: 'mengakhiri seluruh cerita' },
    { n: 8, q: 'Saat menjelaskan denah letak perpustakaan yang berada di samping ruang guru, kata arah yang tepat digunakan adalah ....', a: 'di sebelah kiri', b: 'di samping', c: 'di belakang', d: 'di atas' },
    { n: 9, q: 'Kalimat petunjuk yang tepat untuk mengarahkan teman mengambil buku di atas meja adalah ....', a: '"Wah, bukunya tebal sekali!"', b: '"Apakah kamu sudah membaca buku itu?"', c: '"Ambil buku cerita yang ada di atas meja."', d: '"Kemarin aku pergi ke toko buku."' },
    { n: 10, q: 'Penulisan huruf kapital yang paling tepat terdapat pada kalimat ....', a: 'dino pergi ke surabaya hari senin.', b: 'Dino pergi ke Surabaya hari Senin.', c: 'Dino pergi ke surabaya hari Senin.', d: 'dino pergi ke Surabaya hari senin.' },
    { n: 11, q: 'Tanda baca yang tepat untuk mengakhiri kalimat perintah adalah ....', a: 'titik (.)', b: 'koma (,)', c: 'tanya (?)', d: 'seru (!)' },
    { n: 12, q: 'Ketika mendengarkan pembacaan puisi, hal yang perlu diperhatikan adalah ....', a: 'jumlah halaman buku cerita', b: 'nada, irama, ekspresi, dan pengucapan kata', c: 'harga buku puisi di toko', d: 'warna sampul buku' },
    { n: 13, q: 'Setelah menyimak sebuah puisi tentang ibu, kita dapat mengetahui ....', a: 'harga bahan makanan di pasar', b: 'tema, perasaan, dan pesan dalam puisi', c: 'jarak rumah ke sekolah', d: 'cara membuat layang-layang' },
    { n: 14, q: 'Unsur yang biasanya ada dalam teks naratif adalah ....', a: 'daftar bahan dan alat memasak', b: 'tokoh, latar tempat dan waktu, serta alur cerita', c: 'tabel jadwal pelajaran harian', d: 'rumus perhitungan luas bangun' },
    { n: 15, q: 'Kalimat berikut yang merupakan fakta adalah ....', a: 'Kelinci raksasa itu terbang ke awan membawa wortel emas.', b: 'Matahari terbit dari arah timur pada pagi hari.', c: 'Pohon beringin bisa bernyanyi setiap malam.', d: 'Naga hijau menjaga gunung berapi di negeri dongeng.' },
    { n: 16, q: 'Kalimat berikut yang termasuk fiksi adalah ....', a: 'Air mengalir dari tempat yang tinggi ke tempat yang rendah.', b: 'Semut kecil itu memakai topi daun dan berbicara dengan kupu-kupu.', c: 'Sidoarjo terletak di Provinsi Jawa Timur.', d: 'Siswa kelas 3 belajar di ruang kelas.' },
    { n: 17, q: 'Teks yang berisi langkah-langkah melakukan sesuatu secara berurutan disebut teks ....', a: 'naratif', b: 'prosedur', c: 'puisi', d: 'dialog' },
    { n: 18, q: 'Contoh kegiatan yang langkah-langkahnya dapat ditulis dalam teks prosedur adalah ....', a: 'cara mencuci tangan dengan benar', b: 'kisah perjalanan ke pulau impian', c: 'perasaan sedih saat berpisah', d: 'gambar pemandangan sawah' },
    { n: 19, q: 'Kalimat berikut yang berpola kalimat tunggal (satu subjek dan satu predikat) adalah ....', a: 'Ibu memasak sayur di dapur.', b: 'Adik menangis.', c: 'Ayah membaca koran sambil minum kopi.', d: 'Kakak menyapu lantai dan adik mengepel teras.' },
    { n: 20, q: 'Menulis huruf tegak bersambung yang baik harus memperhatikan ....', a: 'ukuran huruf yang berubah-ubah setiap kata', b: 'bentuk huruf yang saling sambung, rapi, dan konsisten', c: 'tulisan yang ditekan hingga robek', d: 'jarak kata yang tidak teratur' },
    { n: 21, q: 'Urutan alur dalam sebuah cerita umumnya terdiri atas ....', a: 'akhir – tengah – awal', b: 'awal – tengah – akhir', c: 'tengah – akhir – awal', d: 'penutup – judul – isi' },
    { n: 22, q: 'Masalah atau pertentangan yang dialami tokoh dalam cerita disebut ....', a: 'latar', b: 'konflik', c: 'judul', d: 'sampul' },
    { n: 23, q: 'Penggunaan tanda kutip (" ") yang tepat terdapat pada kalimat ....', a: '"Ayah berkata, ayo segera sarapan."', b: 'Ayah berkata, "Ayo segera sarapan."', c: 'Ayah berkata "Ayo segera sarapan".', d: '"Ayah berkata" ayo segera sarapan.' },
    { n: 24, q: 'Kalimat berikut yang menggunakan majas hiperbola adalah ....', a: '"Suaranya menggelegar membelah angkasa."', b: '"Adik minum segelas air putih."', c: '"Burung pipit hinggap di dahan pohon."', d: '"Budi memakai sepatu berwarna hitam."' },
    { n: 25, q: 'Jika kita ingin lewat di depan orang yang sedang duduk berbincang, kata ajaib yang diucapkan adalah ....', a: 'terima kasih', b: 'permisi', c: 'tolong', d: 'maaf' },
    { n: 26, q: 'Manfaat membuat kerangka tulisan sebelum mengarang adalah ....', a: 'tulisan menjadi runtut, jelas, dan tidak keluar dari topik', b: 'menghemat jumlah kertas yang digunakan', c: 'menghilangkan bagian judul cerita', d: 'membuat cerita menjadi sangat pendek' },
    { n: 27, q: 'Saat menyimak sebuah poster ajakan membuang sampah pada tempatnya, kita perlu memahami ....', a: 'pesan, gambar, warna, dan informasi yang disampaikan', b: 'ukuran sepatu pembuat poster', c: 'nama toko alat tulis terdekat', d: 'jumlah halaman dalam buku tulis' },
    { n: 28, q: 'Tanggapan apresiasi yang baik terhadap poster yang menarik dan mudah dibaca adalah ....', a: '"Poster ini kurang berwarna dan sulit dipahami."', b: '"Poster ini menarik, warnanya cerah, dan pesannya mudah dipahami."', c: '"Poster ini sebaiknya tidak diberi gambar sama sekali."', d: '"Poster ini tidak perlu ditempel di dinding."' },
    { n: 29, q: 'Kalimat berikut yang merupakan kalimat pasif adalah ....', a: 'Dina membaca buku cerita.', b: 'Buku cerita dibaca oleh Dina.', c: 'Rudi menyiram bunga mawar.', d: 'Sinta menggambar pemandangan.' },
    { n: 30, q: 'Gambar yang berisi ide utama beserta cabang-cabangnya untuk merencanakan tulisan disebut ....', a: 'peta pikiran', b: 'tabel harga', c: 'daftar hadir', d: 'denah lokasi' },
  ],
  KEYS_BI
);

const PASSAGE_ENG =
  'Hello! My name is Nisa. I am nine years old. I live in Sidoarjo. After school, I usually read a book and help my mother in the kitchen. My mother is cooking soup, and my father is watching TV in the living room.';

const KEYS_ENG: OptionKey[] = [
  'C', 'C', 'C', 'C', 'A', 'B', 'A', 'C', 'A', 'B',
  'C', 'A', 'D', 'B', 'A', 'C', 'C', 'A', 'A', 'B',
  'B', 'B', 'A', 'B', 'B', 'A', 'C', 'B', 'B', 'A',
];

export const QUESTIONS_BAHASA_INGGRIS: Question[] = buildQuestions(
  'eng',
  [
    { n: 1, passageTitle: 'Reading Text for Questions 1–4', passage: PASSAGE_ENG, q: 'How old is Nisa?', a: 'Seven years old', b: 'Eight years old', c: 'Nine years old', d: 'Ten years old' },
    { n: 2, passageTitle: 'Reading Text for Questions 1–4', passage: PASSAGE_ENG, q: 'Where does Nisa live?', a: 'Malang', b: 'Surabaya', c: 'Sidoarjo', d: 'Jakarta' },
    { n: 3, passageTitle: 'Reading Text for Questions 1–4', passage: PASSAGE_ENG, q: "What is Nisa's mother doing in the kitchen?", a: 'Reading a book', b: 'Watching TV', c: 'Cooking soup', d: 'Sweeping the floor' },
    { n: 4, passageTitle: 'Reading Text for Questions 1–4', passage: PASSAGE_ENG, q: "Where is Nisa's father?", a: 'In the kitchen', b: 'In the bedroom', c: 'In the living room', d: 'In the garage' },
    { n: 5, q: 'We say "Good morning" in the ....', a: 'morning', b: 'afternoon', c: 'evening', d: 'night' },
    { n: 6, q: 'When someone asks, "How are you?", the polite answer is ....', a: 'Goodbye', b: "I'm fine, thank you", c: 'See you tomorrow', d: 'I live in Sidoarjo' },
    { n: 7, q: 'To introduce your name in English, you say ....', a: 'My name is ...', b: 'Where are you from?', c: 'Good night', d: 'Who is she?' },
    { n: 8, q: 'When you go to bed at night, you say ....', a: 'Good morning', b: 'Good afternoon', c: 'Good night', d: 'See you later' },
    { n: 9, q: 'The English phrase for "bermain sepak bola" is ....', a: 'play football', b: 'read a book', c: 'ride a bicycle', d: 'draw pictures' },
    { n: 10, q: '"I ride a bicycle after school." In Indonesian, it means ....', a: 'Saya menggambar setelah pulang sekolah.', b: 'Saya bersepeda setelah pulang sekolah.', c: 'Saya menonton TV setelah pulang sekolah.', d: 'Saya membantu ibu setelah pulang sekolah.' },
    { n: 11, q: "My father's mother is my ....", a: 'aunt', b: 'sister', c: 'grandmother', d: 'cousin' },
    { n: 12, q: "My mother's brother is my ....", a: 'uncle', b: 'grandfather', c: 'brother', d: 'father' },
    { n: 13, q: '"Who is she?" "She is my ...."', a: 'father', b: 'brother', c: 'uncle', d: 'aunt' },
    { n: 14, q: '"Who are they?" "They are my ...."', a: 'mother', b: 'grandparents', c: 'sister', d: 'grandfather' },
    { n: 15, q: 'To ask about someone\'s family origin, we ask, "Where is your grandfather ...?"', a: 'from', b: 'in', c: 'at', d: 'to' },
    { n: 16, q: '"My family is from Sidoarjo." The word "from" means ....', a: 'di', b: 'ke', c: 'dari', d: 'untuk' },
    { n: 17, q: 'The room where we sleep is called a ....', a: 'kitchen', b: 'bathroom', c: 'bedroom', d: 'garage' },
    { n: 18, q: 'We put the car in the ....', a: 'garage', b: 'dining room', c: 'bedroom', d: 'living room' },
    { n: 19, q: 'We usually eat together in the ....', a: 'dining room', b: 'bathroom', c: 'garage', d: 'backyard' },
    { n: 20, q: '"My sister is sweeping the floor." The activity is ....', a: 'memasak', b: 'menyapu lantai', c: 'menyiram tanaman', d: 'mencuci piring' },
    { n: 21, q: '"Watering the plants" in Indonesian is ....', a: 'mencuci piring', b: 'menyiram tanaman', c: 'tidur', d: 'berkebun' },
    { n: 22, q: '"My brother is washing the dishes in the kitchen." Where is the brother?', a: 'In the living room', b: 'In the kitchen', c: 'In the bedroom', d: 'In the garden' },
    { n: 23, q: '"What are you doing?" "I am ... a book."', a: 'reading', b: 'cooking', c: 'sleeping', d: 'sweeping' },
    { n: 24, q: '"Gardening" is usually done in the ....', a: 'bathroom', b: 'garden / backyard', c: 'bedroom', d: 'kitchen' },
    { n: 25, q: '"See you tomorrow" means ....', a: 'Sampai jumpa nanti', b: 'Sampai jumpa besok', c: 'Selamat pagi', d: 'Selamat tinggal' },
    { n: 26, q: '"I help my mother after school." The word "help" means ....', a: 'membantu', b: 'melihat', c: 'bermain', d: 'berlari' },
    { n: 27, q: 'The Indonesian meaning of "cousin" is ....', a: 'paman', b: 'bibi', c: 'sepupu', d: 'kakek' },
    { n: 28, q: '"My baby sister is sleeping in the bedroom." The word "sleeping" means ....', a: 'makan', b: 'tidur', c: 'bermain', d: 'menulis' },
    { n: 29, q: '"Nice to meet you." The best response is ....', a: 'I am 9 years old', b: 'Nice to meet you, too', c: "I'm in the kitchen", d: 'Good afternoon' },
    { n: 30, q: 'Which one is a part of the house?', a: 'Living room', b: 'Play football', c: 'Good evening', d: 'Nine years old' },
  ],
  KEYS_ENG
);

const PASSAGE_JAWA =
  'Ing sawijining dina, Kancil mlaku ing pinggir kali. Dheweke kepengin nyabrang menyang sebrang kali amarga akeh woh-wohan sing mateng. Kancil banjur ngapusi Baya supaya gelem dijejeri gegere. Baya sing gampang diapusi gelem jejer, mula Kancil bisa mlaku ing gegere Baya nganti tekan sebrang.';

const KEYS_JAWA: OptionKey[] = [
  'B', 'B', 'A', 'B', 'A', 'B', 'B', 'C', 'B', 'A',
  'B', 'B', 'A', 'B', 'A', 'A', 'B', 'B', 'B', 'B',
  'A', 'A', 'A', 'B', 'A', 'A', 'A', 'B', 'C', 'A',
];

export const QUESTIONS_BASA_JAWA: Question[] = buildQuestions(
  'jawa',
  [
    { n: 1, passageTitle: 'Wacan kanggo Soal Nomer 1–4', passage: PASSAGE_JAWA, q: 'Crita ing ndhuwur kalebu jinise dongeng ....', a: 'legenda', b: 'fabel', c: 'mite', d: 'sage' },
    { n: 2, passageTitle: 'Wacan kanggo Soal Nomer 1–4', passage: PASSAGE_JAWA, q: 'Paraga utama ing wacan kasebut yaiku ....', a: 'Baya', b: 'Kancil', c: 'Kethek', d: 'Manuk' },
    { n: 3, passageTitle: 'Wacan kanggo Soal Nomer 1–4', passage: PASSAGE_JAWA, q: 'Watake Baya ing crita kasebut yaiku ....', a: 'gampang diapusi', b: 'sregep sinau', c: 'wicaksana', d: 'dermawan' },
    { n: 4, passageTitle: 'Wacan kanggo Soal Nomer 1–4', passage: PASSAGE_JAWA, q: 'Pitutur luhur saka crita kasebut yaiku kita aja seneng ....', a: 'tulung-tinulung', b: 'ngapusi wong liya', c: 'sinau sregep', d: 'njaga resik' },
    { n: 5, q: 'Tegese dongeng yaiku crita rakyat kang diwarisake kanthi ....', a: 'lisan saka generasi siji menyang generasi sabanjure', b: 'ditulis ing koran saben dina', c: 'digambar ing tembok kelas', d: 'diwaca ing berita televisi' },
    { n: 6, q: 'Salah siji titikan dongeng yaiku critane ....', a: 'nyata kedadeyan saben dina', b: 'fiktif utawa ora nyata', c: 'nganggo tabel lan grafik', d: 'awujud peraturan sekolah' },
    { n: 7, q: 'Dongeng kang gegayutan karo asal-usul papan utawa kedadeyan diarani ....', a: 'fabel', b: 'legenda', c: 'mite', d: 'sage' },
    { n: 8, q: 'Dongeng kang adhedhasar crita sejarah nanging dicampur rekaan diarani ....', a: 'legenda', b: 'mite', c: 'sage', d: 'fabel' },
    { n: 9, q: 'Wektu, papan, lan swasana ing sajrone crita diarani ....', a: 'amanat', b: 'latar', c: 'watak', d: 'tema' },
    { n: 10, q: 'Nalika nyritakake isine dongeng, swara munggah-mudhun miturut swasana diarani ....', a: 'intonasi', b: 'polatan', c: 'papan', d: 'jeneng' },
    { n: 11, q: 'Tembung kang nyebutake jeneng barang utawa wong diarani tembung ....', a: 'kriya', b: 'aran', c: 'kahanan', d: 'wilangan' },
    { n: 12, q: 'Tembung "mlaku", "mangan", lan "nulis" kalebu tembung ....', a: 'aran', b: 'kriya', c: 'kahanan', d: 'wilangan' },
    { n: 13, q: 'Tembung "gedhe", "apik", lan "sregep" nuduhake tembung ....', a: 'kahanan', b: 'kriya', c: 'aran', d: 'wilangan' },
    { n: 14, q: 'Tembung wilangan yaiku tembung kang nuduhake ....', a: 'sipat barang', b: 'jumlah utawa cacah', c: 'jeneng kewan', d: 'pagawean' },
    { n: 15, q: 'Tembung "aku", "kowe", lan "dheweke" kalebu tembung ....', a: 'sesulih', b: 'aran', c: 'kahanan', d: 'wilangan' },
    { n: 16, q: 'Ing ukara "Ibu masak sayur ing pawon", tembung "Ibu" dadi ....', a: 'jejer', b: 'wasesa', c: 'lesan', d: 'katrangan' },
    { n: 17, q: 'Ing ukara "Bapak maca buku", tembung "maca" dadi ....', a: 'jejer', b: 'wasesa', c: 'lesan', d: 'katrangan' },
    { n: 18, q: 'Perangan ukara kang nerangake wektu, papan, utawa cara diarani ....', a: 'lesan', b: 'katrangan', c: 'wasesa', d: 'jejer' },
    { n: 19, q: 'Cara gemi migunakake energi listrik ing omah yaiku ....', a: 'nguripake lampu nalika awan padhang', b: 'mateni lampu yen ora digunakake', c: 'mbukak lawang kulkas suwe-suwe', d: 'nguripake TV senajan ora ditonton' },
    { n: 20, q: 'Kanggo jarak cedhak, luwih gemi energi yen milih ....', a: 'numpak mobil dhewe', b: 'mlaku utawa numpak sepedha', c: 'numpak motor ngebut', d: 'numpak pesawat' },
    { n: 21, q: 'Teks kang njlentrehake informasi utawa kawruh kanthi cetha lan logis diarani teks ....', a: 'eksposisi', b: 'dongeng', c: 'tembang', d: 'geguritan' },
    { n: 22, q: 'Ancase teks eksposisi yaiku ....', a: 'menehi informasi utawa njlentrehake fakta', b: 'ngarang crita khayalan', c: 'nembangake lagu daerah', d: 'ngucapake salam perpisahan' },
    { n: 23, q: 'Struktur teks eksposisi dumadi saka ....', a: 'pambuka – isi – panutup', b: 'judul – pupuh – cengkok', c: 'bait – rima – purwakanthi', d: 'salam – isi – tanda tangan' },
    { n: 24, q: 'Teks kang isine langkah-langkah nindakake sawijining kegiatan kanthi urut diarani teks ....', a: 'eksposisi', b: 'prosedur', c: 'legenda', d: 'mite' },
    { n: 25, q: 'Tembung panuduh urutan ing teks prosedur biasane nganggo tembung ....', a: 'pisanan, banjur, pungkasan', b: 'wingi, sesuk, emben', c: 'alon, banter, lirih', d: 'abang, ijo, biru' },
    { n: 26, q: 'Conto teks prosedur ing urip saben dina yaiku ....', a: 'cara nandur kembang', b: 'crita asal-usul Rawa Pening', c: 'manfaat ngirit banyu', d: 'watake tokoh Kancil' },
    { n: 27, q: 'Bedane teks eksposisi lan teks prosedur yaiku teks prosedur isine ....', a: 'urutan cara nindakake kegiatan', b: 'crita rekaan jaman biyen', c: 'khayalan tokoh kewan', d: 'tembang macapat' },
    { n: 28, q: 'Yen krungu banyu kran mili nanging ora digunakake, tumindak kang becik yaiku ....', a: 'njarake banyu mili terus', b: 'nutup kran supaya gemi banyu', c: 'nambah iline banyu luwih banter', d: 'lunga ninggalake kran' },
    { n: 29, q: 'Ing ukara "Adhik nyapu latar", tembung "latar" dadi ....', a: 'jejer', b: 'wasesa', c: 'lesan', d: 'katrangan' },
    { n: 30, q: 'Nalika magakake pacelathon ing ngarep kelas, kita kudu nggatekake ....', a: 'pocapan, polatan, solah bawa, lan ekspresi kang becik', b: 'mlayu-mlayu ing sakjeroning kelas', c: 'ngomong lirih banget nganti ora keprungu', d: 'nunduk wae tanpa ndelok kanca' },
  ],
  KEYS_JAWA
);

const PASSAGE_IPAS =
  'Dina adalah siswa kelas 3 SD. Setiap pagi ia menyiram tanaman kacang hijau di halaman rumahnya. Daun telinga Dina membantu menangkap suara burung berkicau di pagi hari, sedangkan hidungnya mencium aroma segar udara pagi. Di kebun belakang, ia melihat ulat yang menempel pada daun dan tahu bahwa kelak ulat tersebut akan berubah menjadi kupu-kupu.';

const KEYS_IPAS: OptionKey[] = [
  'C', 'A', 'B', 'A', 'B', 'C', 'A', 'B', 'C', 'B',
  'A', 'A', 'B', 'A', 'C', 'A', 'A', 'A', 'A', 'A',
  'C', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A',
];

export const QUESTIONS_IPAS: Question[] = buildQuestions(
  'ipas',
  [
    { n: 1, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_IPAS, q: 'Pancaindra yang digunakan Dina untuk mencium aroma segar udara pagi adalah ....', a: 'mata', b: 'telinga', c: 'hidung', d: 'lidah' },
    { n: 2, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_IPAS, q: 'Bagian tubuh yang membantu Dina mendengar suara burung berkicau adalah ....', a: 'telinga', b: 'kulit', c: 'lidah', d: 'hidung' },
    { n: 3, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_IPAS, q: 'Tahapan hewan yang dilihat Dina pada daun di kebun belakang adalah ....', a: 'kepompong', b: 'ulat', c: 'kupu-kupu dewasa', d: 'anak ayam' },
    { n: 4, passageTitle: 'Teks Bacaan untuk Soal Nomor 1–4', passage: PASSAGE_IPAS, q: 'Ulat yang dilihat Dina akan mengalami perubahan bentuk menjadi kupu-kupu melalui daur hidup ....', a: 'telur – ulat – kepompong – kupu-kupu', b: 'telur – berudu – katak muda – katak dewasa', c: 'telur – anak ayam – ayam dewasa', d: 'biji – kecambah – tumbuhan muda' },
    { n: 5, q: 'Fungsi utama mata sebagai pancaindra penglihatan adalah ....', a: 'mencium bau harum bunga', b: 'melihat benda, warna, bentuk, dan gerakan', c: 'mengecap rasa manis dan asin', d: 'merasakan panas dan dingin' },
    { n: 6, q: 'Cara merawat mata agar tetap sehat adalah ....', a: 'membaca di tempat yang gelap', b: 'menatap layar terlalu dekat dalam waktu lama', c: 'membaca di tempat terang dan menjaga jarak layar', d: 'mengucek mata dengan tangan kotor' },
    { n: 7, q: 'Daun telinga berbentuk seperti corong agar mudah ....', a: 'menangkap gelombang suara', b: 'mengecap rasa makanan', c: 'mencium bau asap', d: 'menyaring debu' },
    { n: 8, q: 'Lidah memiliki permukaan berotot dan papila pengecap untuk merasakan ....', a: 'tinggi dan rendahnya suara', b: 'manis, asin, asam, pahit, dan umami', c: 'kasar dan halusnya permukaan', d: 'jauh dan dekatnya jarak' },
    { n: 9, q: 'Kulit berfungsi sebagai indra peraba karena memiliki ....', a: 'lensa mata', b: 'daun telinga', c: 'saraf-saraf perasa', d: 'lubang hidung' },
    { n: 10, q: 'Cara merawat hidung yang benar adalah ....', a: 'memasukkan jari ke lubang hidung', b: 'menjaga kebersihan hidung dan menghindari bau menyengat', c: 'mencium benda yang sangat panas', d: 'menutup hidung sepanjang hari' },
    { n: 11, q: 'Cara mengetahui sejarah keluarga dari masa lalu antara lain dengan ....', a: 'bertanya kepada orang tua, kakek, atau nenek', b: 'merobek foto-foto lama keluarga', c: 'mengabaikan cerita orang tua', d: 'menebak-nebak tanpa bertanya' },
    { n: 12, q: 'Contoh perubahan sosial dalam komunikasi dari masa lalu ke masa kini adalah ....', a: 'dulu memakai surat, kini memakai HP atau pesan daring', b: 'dulu memakai sepeda, kini memakai kaki saja', c: 'dulu memakai baju seragam, kini memakai baju adat saja', d: 'dulu makan nasi, kini makan batu' },
    { n: 13, q: 'Contoh transportasi pada masa lalu yang masih kita kenal adalah ....', a: 'pesawat jet', b: 'becak dan sepeda', c: 'kereta cepat', d: 'kapal selam modern' },
    { n: 14, q: 'Perubahan cara hidup masyarakat dapat terjadi karena perkembangan ....', a: 'teknologi, pendidikan, dan kebutuhan hidup', b: 'warna langit setiap hari', c: 'jumlah jari tangan manusia', d: 'ukuran sepatu anak' },
    { n: 15, q: 'Tahapan siklus hidup manusia setelah masa bayi adalah ....', a: 'lansia', b: 'dewasa', c: 'anak-anak', d: 'lanjut usia' },
    { n: 16, q: 'Ciri khas tahap anak-anak pada siklus hidup manusia adalah ....', a: 'mulai sekolah, bermain, dan belajar banyak hal baru', b: 'baru lahir dan belum bisa berjalan', c: 'bekerja dan mengurus keluarga sendiri', d: 'tubuh melemah karena usia lanjut' },
    { n: 17, q: 'Peran orang tua di dalam keluarga antara lain ....', a: 'memberi kasih sayang, mendidik, dan mencari nafkah', b: 'hanya bermain sepanjang hari tanpa belajar', c: 'menyuruh adik mengerjakan PR sendiri', d: 'tidak peduli pada kebersihan rumah' },
    { n: 18, q: 'Peran anak di rumah yang menunjukkan sikap peduli adalah ....', a: 'belajar dengan sungguh-sungguh dan membantu orang tua', b: 'membuang sampah di ruang tamu', c: 'membantah nasihat ayah dan ibu', d: 'membiarkan mainan berserakan' },
    { n: 19, q: 'Hewan berikut yang mengalami metamorfosis sempurna adalah ....', a: 'kupu-kupu', b: 'ayam', c: 'kucing', d: 'kambing' },
    { n: 20, q: 'Urutan daur hidup katak yang tepat adalah ....', a: 'telur – berudu – katak muda – katak dewasa', b: 'telur – ulat – kepompong – katak dewasa', c: 'anak katak – telur – katak dewasa', d: 'berudu – telur – katak dewasa' },
    { n: 21, q: 'Hewan berikut yang tidak mengalami metamorfosis dan lahir langsung mirip induknya adalah ....', a: 'nyamuk', b: 'kupu-kupu', c: 'kucing', d: 'katak' },
    { n: 22, q: 'Tahap awal siklus hidup tumbuhan yang ditanam di tanah adalah ....', a: 'biji', b: 'buah matang', c: 'daun gugur', d: 'batang tua' },
    { n: 23, q: 'Setelah biji berkecambah dan tumbuh akar serta tunas, tumbuhan memasuki tahap ....', a: 'tumbuhan muda', b: 'biji kering', c: 'layu', d: 'mati' },
    { n: 24, q: 'Tumbuhan dewasa pada siklus hidup tumbuhan dapat ....', a: 'berbunga dan menghasilkan biji baru', b: 'menghilang tanpa meninggalkan akar', c: 'berubah menjadi hewan', d: 'berhenti tumbuh selamanya' },
    { n: 25, q: 'Cara berinteraksi yang baik di dalam keluarga adalah ....', a: 'saling menyapa, makan bersama, dan membantu pekerjaan rumah', b: 'saling marah saat diminta tolong', c: 'jarang berbicara dan selalu menyendiri', d: 'menyalahkan anggota keluarga lain' },
    { n: 26, q: 'Merawat kulit agar tetap sehat dapat dilakukan dengan ....', a: 'mandi teratur dan melindungi kulit dari matahari berlebih', b: 'tidak pernah mandi selama seminggu', c: 'menggaruk kulit dengan benda tajam', d: 'menyentuh air mendidih' },
    { n: 27, q: 'Perubahan permainan anak dari masa lalu ke masa kini terlihat pada ....', a: 'dulu banyak bermain petak umpet atau congklak, kini banyak bermain game di gawai', b: 'dulu bermain gawai, kini bermain kelereng saja', c: 'permainan anak tidak pernah berubah sama sekali', d: 'anak-anak tidak boleh bermain lagi' },
    { n: 28, q: 'Kakek dan nenek di keluarga biasanya berperan memberikan ....', a: 'nasihat dan cerita masa lalu', b: 'tugas piket kelas', c: 'nilai rapor sekolah', d: 'seragam upacara' },
    { n: 29, q: 'Sikap yang tepat terhadap perubahan zaman adalah ....', a: 'menghargai masa lalu sambil beradaptasi dengan masa kini dan masa depan', b: 'melupakan semua pelajaran masa lalu', c: 'menolak semua hal baru tanpa berpikir', d: 'menganggap diri paling benar' },
    { n: 30, q: 'Contoh tumbuhan yang memiliki siklus hidup mulai dari biji adalah ....', a: 'kacang hijau dan jagung', b: 'kucing dan anjing', c: 'katak dan nyamuk', d: 'ikan dan burung' },
  ],
  KEYS_IPAS
);
