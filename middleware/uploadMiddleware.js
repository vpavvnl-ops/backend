const multer = require('multer');
const path = require('path');

// STORAGE
const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, 'uploads/');

    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + '-' + file.originalname;

        cb(null, uniqueName);

    }

});

// FILE FILTER
const fileFilter = (req, file, cb) => {

    const allowedTypes = /jpeg|jpg|png/;

    const extname = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
    );

    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {

        return cb(null, true);

    } else {

        cb('Only JPG, JPEG, PNG images allowed');

    }

};

// UPLOAD
const upload = multer({
    storage,
    fileFilter
});

module.exports = upload;