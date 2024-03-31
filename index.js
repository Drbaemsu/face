const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = 3000;
const API_KEY = " "; // 실제 Google Generative AI API 키로 교체하세요
const MODEL_NAME = "gemini-1.0-pro-vision-latest";

// 정적 파일 제공 설정 (public 폴더 내의 파일을 자동으로 제공)
app.use(express.static("public"));

// 루트 경로에 대한 GET 요청 처리
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 이미지 분석을 위한 POST 요청 처리
app.post("/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No image file uploaded.");
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.4,
    topK: 32,
    topP: 1,
    maxOutputTokens: 4096,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    // 추가 safety settings
  ];

  const parts = [
    { text: "첨부된 이미지를 기반으로 한 성격 분석을 제공해주세요." },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: Buffer.from(fs.readFileSync(req.file.path)).toString("base64"),
      },
    },
  ];

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
      safetySettings,
    });

    // 만약 result.response.text가 함수라면, 결과를 기다립니다.
    if (typeof result.response.text === "function") {
      const textResult = await result.response.text();
      res.send(textResult);
    } else {
      // result.response.text가 이미 문자열이라면, 직접 전송합니다.
      res.send(result.response.text);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing the image analysis request.");
  } finally {
    // 업로드된 이미지 파일 삭제
    fs.unlink(req.file.path, (err) => {
      if (err) throw err;
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

