const reviewModel = require("../models/reviewModel");
const bookModel = require("../models/bookModel");
const mongoose = require("mongoose");

const isValidObjectId = function (objectId) {
  return mongoose.Types.ObjectId.isValid(objectId);
};


const checkvalidReqBody = function (resBody) {
  return Object.keys(resBody).length > 0
}

const review = async function (req, res) {
  try {
    let bookId = req.params.bookId;

    if (!isValidObjectId(bookId)) return res.status(400).send({ status: false, message: "Enter a valid book id" });

    let checkBookId = await bookModel.findById(bookId);
    if (!checkBookId)
      return res.status(404).send({ status: false, message: "Book not found" });

    if (checkBookId.isDeleted == true)
      return res.status(404).send({ status: false, message: "Book not found or might have been deleted" });

    let data = req.body;
     

    if (!checkvalidReqBody(data))
      return res.status(400).send({ status: false, message: "Details required to add review to book" });

    if (!data.rating)
      return res.status(400).send({ status: false, message: "Rating is required and should not be 0" });

      if(!data.reviewedAt){
        return res.status(400).send({status:false,message:"reviewedAt is required "})
       }

    if (!/^[1-5]$/.test(data.rating)) {
      return res.status(400).send({ status: false, message: "Rate between 1-5 or no decimal and must be number only" });
    }
    // ================ Set attribute in data==============================
    data.bookId = bookId;

    let createData = await reviewModel.create(data);
    await bookModel.updateOne({ _id: bookId }, { $inc: { reviews: 1 } }); 

    const bookdata = await bookModel.findOne({ _id: bookId})
    const reviewData = await reviewModel.find({_id:createData._id})
    const { _id, title, excerpt, userId, category, subcategory, isDeleted, reviews, releasedAt, createdAt, updatedAt } = bookdata
    const savadata = { _id, title, excerpt, userId, category, subcategory, isDeleted, reviews, releasedAt,createdAt,updatedAt, reviewData }

    res.status(201).send({ status: true, message: "Success", data: savadata });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

const upadateReview = async function (req, res) {
  try {
    let bookId = req.params.bookId
    let reviewId = req.params.reviewId

    if (!isValidObjectId(bookId)) {
      return res.status(400).send({ status: false, message: "Invalid book Id" })
    }

    let bookData = await bookModel.findById(bookId)
    if (!bookData) return res.status(404).send({ status: false, message: "Book Not Found", });
    if (bookData.isDeleted == true) return res.status(404).send({ status: false, message: "Book already Deleted :( " });

    if (!isValidObjectId(reviewId)) {
      return res.status(400).send({ status: false, message: "Invalid review Id" })
    }
    let reviewDat = await reviewModel.findById(reviewId)
    if (!reviewDat) return res.status(404).send({ status: false, message: "Review Not Found", });
    if (reviewDat.isDeleted == true) return res.status(404).send({ status: false, message: "Review already Deleted :( " });

    let upadateData = req.body
    if (!checkvalidReqBody(upadateData)) {
      return res.status(400).send({ status: false, message: "Invalide Request. Please Provide Review Details" })
    }

    let { review, rating, reviewedBy } = upadateData

    if(!(review || rating ||  reviewedBy)){
      return res.status(400).send({status:false, message:"You can only update review, rating, reviewedBy  "})
    }

      reviewDat.review = review
      await reviewDat.save() 

    if (reviewedBy) {
      if (!/^[a-zA-Z\s]+$/.test(reviewedBy)) return res.status(400).send({ status: false, message: "reviewedBy can be in alphabets only !!" });
      reviewDat.reviewedBy = reviewedBy
      await reviewDat.save()

    }
    if (rating) {
      if (!/^[1-5]$/.test(rating)) return res.status(400).send({ status: false, message: "rating between 1-5 or no decimal and must be number only" });
      reviewDat.rating = rating
      await reviewDat.save()

    }
    let reviewData = await reviewModel.find({ _id: reviewId })
    
    const { _id, title, excerpt, userId, category, subcategory, isDeleted, reviews, releasedAt, createdAt, updatedAt } = bookData
    const savadata = { _id, title, excerpt, userId, category, subcategory, isDeleted, reviews, releasedAt,createdAt,updatedAt, reviewData }

    res.status(200).send({ status: true, message: "success", data: savadata })

  } catch (error) {
    return res.status(500).send({ status: false, message: err.message })
  }
}

const deletedReview = async function (req, res) {
  try {
    let bookId = req.params.bookId;
    let reviewId = req.params.reviewId;
    //----------------------Validation Start--------------------------------------------------------//

    if (!isValidObjectId(bookId)) {
      return res.status(400).send({ status: false, message: "Invalid book Id" })
    }

    let bookData = await bookModel.findById(bookId)
    if (!bookData) return res.status(404).send({ status: false, message: "Book Not Found", });
    if (bookData.isDeleted == true) return res.status(404).send({ status: false, message: "Book already Deleted :( " });

    if (!isValidObjectId(reviewId)) {
      return res.status(400).send({ status: false, message: "Invalid review Id" })
    }
    let reviewData = await reviewModel.findById(reviewId)
    if (!reviewData) return res.status(404).send({ status: false, message: "Review Not Found", });
    if (bookData.isDeleted == true) return res.status(404).send({ status: false, message: "Review already Deleted :( " });
    //----------------------Validation Ends--------------------------------------------------------//

    let isReviewIdPresent = await reviewModel.findOne({ _id: reviewId, isDeleted: false });

    if (isReviewIdPresent == null) {
      return res.status(404).send({ status: false, msg: "Review already deleted" });
    }

    const isBookIdPresent = await bookModel.findOneAndUpdate(
      {
        _id: bookId,
        isDeleted: false,
      },
      {
        $inc: {
          reviews: -1,
        },
      }
    );

    if (isBookIdPresent == null) {
      return res.status(404).send({ status: false, message: "No book is found" });
    }

    const date = new Date();

    let deleteReview = await reviewModel.findByIdAndUpdate(
      reviewId,
      {
        isDeleted: true,
        deletedAt: date,
      },
      {
        new: true,
      }
    );
    return res.status(200).send({ status: true, message: "Success"});
  } catch (err) {
    return res.status(500).send({ msg: err.message });
  }
};


module.exports = { review, upadateReview, deletedReview }
