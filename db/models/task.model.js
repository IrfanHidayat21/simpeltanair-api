const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minLength: 1,
        trim: true
    },
    tanggal: {
        type: Date,
        required: true,
        minLength: 1,
        trim: true
    },
    waktuMulai: {
        type: String,
        required: false,
        trim: true
    },
    waktuSelesai: {
        type: String,
        required: false,
        trim: true
    },
    _listId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    completed: {
        type:  Boolean,
        default: false
    }
})

const Task = mongoose.model('Task', TaskSchema);

module.exports = { Task }