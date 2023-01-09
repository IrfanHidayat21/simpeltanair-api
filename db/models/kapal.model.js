const mongoose = require('mongoose');

const KapalSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minLength: 1,
        trim: true
    },
    namaKapal: {
        type: String,
        required: false,
        minLength: 1

    },
    jumlahMuatan: {
        type: Number,
        required: false,
        minLength: 1

    },
    // with auth
    _userId: {
        type: mongoose.Types.ObjectId,
        required: true
    }
})

const Kapal = mongoose.model('Kapal', KapalSchema);

module.exports = { Kapal }