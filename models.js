const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * @typedef {Object} Genre
 * @property {string} Name - The name of the genre.
 * @property {string} Description - The description of the genre.
 */

/**
 * @typedef {Object} Director
 * @property {string} Name - The name of the director.
 * @property {string} Bio - The biography of the director.
 */

/**
 * @typedef {Object} Movie
 * @property {string} Title - The title of the movie.
 * @property {string} Description - The description of the movie.
 * @property {Genre} Genre - The genre of the movie.
 * @property {Director} Director - The director of the movie.
 * @property {Array<string>} Actors - The actors in the movie.
 * @property {string} ImagePath - The image path of the movie.
 * @property {boolean} Featured - Whether the movie is featured.
 */

/**
 * Movie schema.
 * @type {mongoose.Schema<Movie>}
 */
let movieSchema = mongoose.Schema({
  Title: { type: String, required: true },
  Description: { type: String, required: true },
  Genre: {
    Name: String,
    Description: String
  },
  Director: {
    Name: String,
    Bio: String
  },
  Actors: [String],
  ImagePath: { type: String },
  Featured: { type: Boolean }
});

/**
 * @typedef {Object} User
 * @property {string} Username - The username of the user.
 * @property {string} Password - The password of the user.
 * @property {string} Email - The email of the user.
 * @property {Date} BirthDate - The birth date of the user.
 * @property {Array<mongoose.Schema.Types.ObjectId>} FavoriteMovies - The favorite movies of the user.
 */

/**
 * User schema.
 * @type {mongoose.Schema<User>}
 */
let userSchema = mongoose.Schema({
  Username: { type: String, required: true },
  Password: { type: String, required: true },
  Email: { type: String, required: true },
  BirthDate: Date,
  FavoriteMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }]
});

/**
 * Hashes a password.
 * @function
 * @memberof User
 * @param {string} password - The password to hash.
 * @returns {string} The hashed password.
 */
userSchema.statics.hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

/**
 * Validates a password.
 * @function
 * @memberof User
 * @param {string} password - The password to validate.
 * @returns {boolean} True if the password is valid, otherwise false.
 */
userSchema.methods.validatePassword = function(password) {
  return bcrypt.compareSync(password, this.Password);
};

/**
 * @type {mongoose.Model<Movie>}
 */
let Movie = mongoose.model('Movie', movieSchema);

/**
 * @type {mongoose.Model<User>}
 */
let User = mongoose.model('User', userSchema);

module.exports.Movie = Movie;
module.exports.User = User;
