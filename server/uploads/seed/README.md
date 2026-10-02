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

Generated copies are packaged under `src/main/resources/static/images/seed/`.
The Java application serves those automatically when this folder has no matching
image. Files placed here override the packaged demo images.

Run the application from `server/`:

```bash
./mvnw spring-boot:run
```

The seeded property records point to `http://localhost:4000/uploads/seed/<filename>`.

The generated interiors are fictional demo images, not actual property photos.
