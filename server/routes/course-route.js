const router = require("express").Router();
const Course = require("../models").course;
const courseValidation = require("../validation").courseValidation;

router.use((req, res, next) => {
  console.log("course route 正在接受一個request...");
  next();
});

//獲得系統中所有課程
router.get("/", async (req, res) => {
  let courseFound = await Course.find({})
    .populate("instructor", ["username", "email"])
    .exec();
  return res.send(courseFound);
});

//用id尋找課程
router.get("/:_id", async (req, res) => {
  let { _id } = req.params;
  try {
    let courseFound = await Course.findOne({ _id })
      .populate("instructor", ["email"])
      .exec();
    return res.send(courseFound);
  } catch (e) {
    return res.status(500).send(e);
  }
});
//新增課程
router.post("/", async (req, res) => {
  //驗證數據符合規範
  let { error } = courseValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  if (req.user.isStudent()) {
    return res
      .status(400)
      .send("只有講師才能發布新課程，若你已經是講師，請透過講師帳號登入。");
  }

  let { title, description, price } = req.body;
  try {
    let newCourse = new Course({
      title,
      description,
      price,
      instructor: req.user._id,
    });
    let savedCourse = await newCourse.save();
    return res.send({
      messgage: "新課程已經保存",
      savedCourse,
    });
  } catch (e) {
    return res.status(500).send("無法創建課程...");
  }
});

//更改課程//1
router.patch("/:_id", async (req, res) => {
  let { error } = courseValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let { _id } = req.params;
  //確認課程存在
  try {
    let courseFound = await Course.findOne({ _id });
    if (!courseFound) {
      return res.status(400).send("找不到課程，無法更新內容");
    }

    //使用者必須是此課程講師，才能編輯課程
    if (courseFound.instructor.equals(req.user._id)) {
      let updatedCourse = await Course.findOneAndUpdate({ _id }, req.body, {
        new: true,
        runValidators: true,
      });
      return res.send({ msg: "課程已經更新成功", updatedCourse });
    } else {
      return res.status(403).send("只有此課程講師才能編輯課程。");
    }
  } catch (e) {
    return res.status(500).send("發生錯誤");
  }
});

//刪除課程
router.delete("/:_id", async (req, res) => {
  let { _id } = req.params;
  //確認課程存在
  try {
    let courseFound = await Course.findOne({ _id }).exec();
    if (!courseFound) {
      return res.status(400).send("找不到課程，無法刪除課程");
    }

    //使用者必須是此課程講師，才能刪除課程
    if (courseFound.instructor.equals(req.user._id)) {
      let deletedCourse = await Course.deleteOne({ _id }).exec();
      return res.send({ msg: "課程已經成功刪除" });
    } else {
      return res.status(403).send("只有此課程講師才能刪除課程。");
    }
  } catch (e) {
    return res.status(500).send("發生錯誤");
  }
});

module.exports = router;
