import bcrypt from 'bcryptjs';
import { db } from './db.js';

// Run with: npm run seed
// This fills a fresh local SQLite database with realistic demo content.
// Every demo account uses the password: password123
const password = await bcrypt.hash('password123', 10);

function ensureUser(name, email, role = 'USER') {
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    const result = db
      .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
      .run(name, email, password, role);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }

  return user;
}

function ensureProperty(property) {
  let row = db.prepare('SELECT * FROM properties WHERE title = ?').get(property.title);

  if (!row) {
    const result = db.prepare(`
      INSERT INTO properties
      (title, description, location, price, type, image, verified, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      property.title,
      property.description,
      property.location,
      property.price,
      property.type,
      property.image,
      property.verified ? 1 : 0,
      property.ownerId,
    );

    row = db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid);
  }

  return row;
}

function ensureRoommateProfile(user, profile) {
  const existing = db.prepare('SELECT id FROM roommate_profiles WHERE user_id = ?').get(user.id);
  if (existing) return;

  db.prepare(`
    INSERT INTO roommate_profiles
    (user_id, bio, location, budget, move_in, lifestyle)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    profile.bio,
    profile.location,
    profile.budget,
    profile.moveIn,
    profile.lifestyle,
  );
}

function ensureFavorite(userId, propertyId) {
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, property_id) VALUES (?, ?)')
    .run(userId, propertyId);
}

function ensureReview(userId, propertyId, rating, comment) {
  const existing = db.prepare(
    'SELECT id FROM reviews WHERE user_id = ? AND property_id = ? AND comment = ?',
  ).get(userId, propertyId, comment);

  if (!existing) {
    db.prepare(
      'INSERT INTO reviews (user_id, property_id, rating, comment) VALUES (?, ?, ?, ?)',
    ).run(userId, propertyId, rating, comment);
  }
}

function ensureBooking(userId, propertyId, message, status = 'PENDING') {
  const existing = db.prepare(
    'SELECT id FROM bookings WHERE user_id = ? AND property_id = ?',
  ).get(userId, propertyId);

  if (!existing) {
    db.prepare(
      'INSERT INTO bookings (user_id, property_id, message, status) VALUES (?, ?, ?, ?)',
    ).run(userId, propertyId, message, status);
  }
}

function ensureMessage(senderId, receiverId, text) {
  const existing = db.prepare(
    'SELECT id FROM messages WHERE sender_id = ? AND receiver_id = ? AND text = ?',
  ).get(senderId, receiverId, text);

  if (!existing) {
    db.prepare(
      'INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)',
    ).run(senderId, receiverId, text);
  }
}

// -----------------------------------------------------------------------------
// USERS
// -----------------------------------------------------------------------------
const landlord = ensureUser('Amaka Okafor', 'landlord@shenest.test', 'LANDLORD');
const landlordTwo = ensureUser('Tomi Adeyemi', 'tomi.landlord@shenest.test', 'LANDLORD');
const admin = ensureUser('SheNest Admin', 'admin@shenest.test', 'ADMIN');

const ada = ensureUser('Ada Nwosu', 'ada@shenest.test');
const zainab = ensureUser('Zainab Bello', 'zainab@shenest.test');
const temi = ensureUser('Temi Adebayo', 'temi@shenest.test');
const chioma = ensureUser('Chioma Eze', 'chioma@shenest.test');
const rita = ensureUser('Rita George', 'rita@shenest.test');

// -----------------------------------------------------------------------------
// PROPERTIES / ROOMS
// Generated SheNest images are referenced with local filenames below.
// Put the generated files inside server/uploads/seed/ using these names.
// -----------------------------------------------------------------------------
const studioLekki = ensureProperty({
  title: 'Blush Studio in Lekki Phase 1',
  description: 'A bright self-contained studio with a soft modern interior, fitted kitchenette, air conditioning and a calm work corner. Suitable for one woman looking for privacy and comfort.',
  location: 'Lekki Phase 1, Lagos',
  price: 1350000,
  type: 'Studio',
  image: 'http://localhost:4000/uploads/seed/cozy-blush-studio.png',
  verified: true,
  ownerId: landlord.id,
});

const yabaRoom = ensureProperty({
  title: 'Bright Private Room near Yaba',
  description: 'A furnished private room in a women-only shared apartment with a study desk, wardrobe, air conditioning and shared kitchen facilities.',
  location: 'Yaba, Lagos',
  price: 720000,
  type: 'Shared apartment',
  image: 'http://localhost:4000/uploads/seed/bright-yaba-room.png',
  verified: true,
  ownerId: landlord.id,
});

const ikejaApartment = ensureProperty({
  title: 'Modern One-Bed Apartment in Ikeja',
  description: 'A warm one-bedroom apartment in a quiet residential area with good natural light, fitted kitchen, living room and secure compound.',
  location: 'Ikeja GRA, Lagos',
  price: 1800000,
  type: 'Apartment',
  image: 'http://localhost:4000/uploads/seed/modern-ikeja-apartment.png',
  verified: true,
  ownerId: landlordTwo.id,
});

const ikoyiRoom = ensureProperty({
  title: 'Premium Ensuite Room in Ikoyi',
  description: 'Spacious ensuite bedroom in a premium shared apartment. Includes wardrobe space, air conditioning, a study area and access to a furnished lounge.',
  location: 'Ikoyi, Lagos',
  price: 1650000,
  type: 'Shared apartment',
  image: 'http://localhost:4000/uploads/seed/premium-ikoyi-bedroom.png',
  verified: true,
  ownerId: landlordTwo.id,
});

const akokaShared = ensureProperty({
  title: 'Affordable Shared Room in Akoka',
  description: 'A tidy two-person room designed for students and young professionals. Includes individual study desks, wardrobe storage and easy access to Yaba.',
  location: 'Akoka, Lagos',
  price: 480000,
  type: 'Shared apartment',
  image: 'http://localhost:4000/uploads/seed/akoka-shared-room.png',
  verified: true,
  ownerId: landlord.id,
});

const viStudio = ensureProperty({
  title: 'City View Studio in Victoria Island',
  description: 'A stylish studio with city views, furnished living area, modern bathroom and compact kitchen. Ideal for a professional working on the Island.',
  location: 'Victoria Island, Lagos',
  price: 2500000,
  type: 'Studio',
  image: 'http://localhost:4000/uploads/seed/vi-city-studio.png',
  verified: true,
  ownerId: landlordTwo.id,
});

const gbagadaApartment = ensureProperty({
  title: 'Calm Two-Bed Apartment in Gbagada',
  description: 'A comfortable two-bedroom apartment in a secure compound with spacious living room, good road access and reliable neighbourhood amenities.',
  location: 'Gbagada, Lagos',
  price: 1550000,
  type: 'Apartment',
  image: 'http://localhost:4000/uploads/seed/gbagada-apartment.png',
  verified: false,
  ownerId: landlord.id,
});

const surulereRoom = ensureProperty({
  title: 'Cozy Room in Surulere',
  description: 'A clean private room in a friendly women-only flat, close to public transport, supermarkets and major roads.',
  location: 'Surulere, Lagos',
  price: 650000,
  type: 'Shared apartment',
  image: 'http://localhost:4000/uploads/seed/surulere-room.png',
  verified: true,
  ownerId: landlordTwo.id,
});

// -----------------------------------------------------------------------------
// ROOMMATE PROFILES
// -----------------------------------------------------------------------------
ensureRoommateProfile(ada, {
  bio: 'Product designer working hybrid. I am looking for a calm roommate and a bright apartment around Yaba or Surulere.',
  location: 'Yaba, Lagos',
  budget: 750000,
  moveIn: 'October 2026',
  lifestyle: 'Quiet, tidy, non-smoker, likes cooking and early nights.',
});

ensureRoommateProfile(zainab, {
  bio: 'Graduate trainee working on the Island. I am easy-going and looking for someone respectful to share a two-bedroom apartment.',
  location: 'Lekki, Lagos',
  budget: 950000,
  moveIn: 'November 2026',
  lifestyle: 'Friendly, organised, social on weekends, values personal space.',
});

ensureRoommateProfile(temi, {
  bio: 'Software developer working mostly from home. Looking for a roommate around Ikeja or Maryland.',
  location: 'Ikeja, Lagos',
  budget: 850000,
  moveIn: 'October 2026',
  lifestyle: 'Very tidy, quiet weekdays, enjoys movies and gym sessions.',
});

ensureRoommateProfile(chioma, {
  bio: 'Master’s student looking for another student or young professional to share a comfortable place close to Yaba.',
  location: 'Akoka, Lagos',
  budget: 550000,
  moveIn: 'September 2026',
  lifestyle: 'Studious, clean, early riser, prefers a peaceful home.',
});

ensureRoommateProfile(rita, {
  bio: 'Marketing professional. I would love a clean, secure apartment with another working woman around VI, Oniru or Lekki.',
  location: 'Victoria Island, Lagos',
  budget: 1300000,
  moveIn: 'December 2026',
  lifestyle: 'Outgoing but respectful, neat, enjoys hosting occasionally.',
});

// -----------------------------------------------------------------------------
// REVIEWS
// -----------------------------------------------------------------------------
ensureReview(ada.id, studioLekki.id, 5, 'The space looks exactly like the listing and the area feels convenient and secure.');
ensureReview(zainab.id, studioLekki.id, 4, 'Very lovely studio. The landlord also responded quickly to my questions.');
ensureReview(chioma.id, yabaRoom.id, 5, 'Great option for someone working or studying around Yaba.');
ensureReview(temi.id, ikejaApartment.id, 4, 'Quiet environment and plenty of natural light.');
ensureReview(rita.id, viStudio.id, 5, 'Beautiful apartment and excellent location for Island work.');
ensureReview(ada.id, surulereRoom.id, 4, 'Simple, clean and reasonably priced for the area.');

// -----------------------------------------------------------------------------
// FAVORITES
// -----------------------------------------------------------------------------
ensureFavorite(ada.id, yabaRoom.id);
ensureFavorite(ada.id, surulereRoom.id);
ensureFavorite(zainab.id, studioLekki.id);
ensureFavorite(zainab.id, viStudio.id);
ensureFavorite(temi.id, ikejaApartment.id);
ensureFavorite(rita.id, viStudio.id);

// -----------------------------------------------------------------------------
// BOOKINGS
// -----------------------------------------------------------------------------
ensureBooking(ada.id, yabaRoom.id, 'Hi Amaka, I would like to arrange a viewing this weekend if possible.', 'APPROVED');
ensureBooking(zainab.id, studioLekki.id, 'I work in Lekki and I am interested in moving in next month.', 'PENDING');
ensureBooking(temi.id, ikejaApartment.id, 'Please let me know if I can inspect the apartment after work on Friday.', 'PENDING');
ensureBooking(rita.id, viStudio.id, 'I am interested in the studio and would like to know the earliest available viewing date.', 'APPROVED');
ensureBooking(chioma.id, akokaShared.id, 'I am a student nearby and would love to see the room.', 'DECLINED');

// -----------------------------------------------------------------------------
// SAMPLE MESSAGES
// -----------------------------------------------------------------------------
ensureMessage(ada.id, landlord.id, 'Hello, I saw the Yaba room on SheNest. Is it still available?');
ensureMessage(landlord.id, ada.id, 'Hi Ada, yes it is still available. You can send a booking request for a viewing.');
ensureMessage(ada.id, landlord.id, 'Perfect, I have just sent one. Thank you.');

ensureMessage(zainab.id, rita.id, 'Hi Rita, I saw that you are also searching around VI and Lekki. Are you open to a two-bedroom apartment?');
ensureMessage(rita.id, zainab.id, 'Hi Zainab, yes definitely. My main priorities are security, cleanliness and easy access to work.');

ensureMessage(temi.id, chioma.id, 'Hi Chioma, your roommate profile sounds like we have similar home habits.');
ensureMessage(chioma.id, temi.id, 'Hi Temi! I thought the same. I am happy to chat about locations and budget.');

console.log('SheNest demo seed complete.');
console.log('Demo password for every seeded account: password123');
console.log(`Seeded users: ${db.prepare('SELECT COUNT(*) count FROM users').get().count}`);
console.log(`Seeded properties: ${db.prepare('SELECT COUNT(*) count FROM properties').get().count}`);
console.log(`Seeded roommate profiles: ${db.prepare('SELECT COUNT(*) count FROM roommate_profiles').get().count}`);
console.log(`Seeded reviews: ${db.prepare('SELECT COUNT(*) count FROM reviews').get().count}`);
console.log(`Seeded bookings: ${db.prepare('SELECT COUNT(*) count FROM bookings').get().count}`);
console.log(`Seeded messages: ${db.prepare('SELECT COUNT(*) count FROM messages').get().count}`);
