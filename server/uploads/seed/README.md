# SheNest generated seed images

The SQLite seed data expects these generated property images in this folder:

- `cozy-blush-studio.png`
- `bright-yaba-room.png`
- `modern-ikeja-apartment.png`
- `premium-ikoyi-bedroom.png`
- `akoka-shared-room.png`
- `vi-city-studio.png`
- `gbagada-apartment.png`
- `surulere-room.png`

The image bundle generated in ChatGPT already uses these exact filenames.

After placing the images here, run:

```bash
cd server
npm install
npm run seed
npm run dev
```

The seeded property records point to `http://localhost:4000/uploads/seed/<filename>`.
