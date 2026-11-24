# غرفة بالكود

دردشة مباشرة: أي شخصين يكتبون نفس الكود يدخلون نفس الغرفة.

## هيكل المشروع
```
chat-app/
├── server.js        الخادم (HTTP + WebSocket)
├── package.json     الاعتماديات وأمر التشغيل
├── render.yaml      إعداد النشر على Render (خطة مجانية)
├── Dockerfile       للنشر عبر Docker
├── .gitignore
└── public/
    └── index.html   الواجهة
```

## التشغيل محلياً
npm install
npm start
ثم افتح http://localhost:3000

## النشر على Render (مجاني)
1. ارفع محتويات هذا المجلد إلى مستودع GitHub
2. على render.com: New > Web Service > اختر المستودع
3. اضغط Deploy (الإعدادات تُقرأ من render.yaml)
