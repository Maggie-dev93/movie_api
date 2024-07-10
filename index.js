const express = require('express');
const bodyParser = require('body-parser');
const morgan = require("morgan");
const mongoose = require('mongoose');
const Models = require('./models.js');
const { check, validationResult } = require("express-validator");

const Movies = Models.Movie;
const Users = Models.User;

console.log('starting mongo connection');
mongoose.connect(process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });
//mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
console.log('connected to mongo');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('common')); // Uncomment for HTTP request logging
app.use(express.static('public'));

const cors = require('cors');
const allowedOrigins = ['http://localhost:8080', 'http://localhost:1234', 'https://movies-flixmcn-ed96d6a64be1.herokuapp.com', 'https://myflix-mcn.netlify.app' ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('The CORS policy for this application does not allow access from the specified origin.'));
    }
  }
}))

const auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

/**
 * Default route.
 * @name /
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.get("/", (req, res) => {
    res.send("Welcome to MyFlix!");
});

/**
 * User login.
 * @name /login
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.post('/login',
  [
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Username contains non-alphanumeric characters not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
  ], 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { Username, Password } = req.body;

    try {
      const user = await Users.findOne({ Username });
      if (!user) {
        return res.status(400).send('Username or password is incorrect');
      }

      const isMatch = await bcrypt.compare(Password, user.Password);
      if (!isMatch) {
        return res.status(400).send('Username or password is incorrect');
      }

      res.status(200).json({ message: 'Login successful', user });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  }
);

/**
 * Add a new user.
 * @name /users
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.post('/users', 
  [
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], async (req, res) => {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    await Users.findOne({ Username: req.body.Username })
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + ' already exists');
        } else {
          Users
            .create({
              Username: req.body.Username,
              Password: hashedPassword,
              Email: req.body.Email,
              BirthDate: req.body.BirthDate
            })
            .then((user) => { res.status(201).json(user) })
            .catch((error) => {
              console.error(error);
              res.status(500).send('Error: ' + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  });

/**
 * Get all users.
 * @name /users
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.get('/users', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Users.find()
      .then((users) => {
        res.status(201).json(users);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

/**
 * Get a user by username.
 * @name /users/:Username
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.get('/users/:Username', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Users.findOne({ Username: req.params.Username })
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

/**
 * Update a user's info by username.
 * @name /users/:Username
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.put('/users/:Username', [
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const { Username, Password, Email, BirthDate } = req.body;
      let updateObject = {};
      if (Username) updateObject.Username = Username;
      if (Password) updateObject.Password = Users.hashPassword(Password);
      if (Email) updateObject.Email = Email;
      if (BirthDate) updateObject.BirthDate = BirthDate;

      const updatedUser = await Users.findOneAndUpdate(
        { Username: req.params.Username },
        { $set: updateObject },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error: ' + error.message);
    }
  }
]);

/**
 * Add a movie to a user's list of favorites.
 * @name /users/:Username/movies/:MovieID
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Users.findOneAndUpdate({ Username: req.params.Username }, {
      $push: { FavoriteMovies: req.params.MovieID }
    },
   { new: true })
  .then((updatedUser) => {
    res.json(updatedUser);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

/**
 * Delete a user by username.
 * @name /users/:Username
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Users.findOneAndDelete({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/**
 * Remove a movie from a user's list of favorites.
 * @name /users/:Username/movies/:MovieID
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const { Username, MovieID } = req.params;
  await Users.findOneAndUpdate(
      { Username: Username },
      { $pull: { FavoriteMovies: MovieID } },
      { new: true }
  )
  .then(user => {
      if (!user) {
          res.status(404).send(`${Username} was not found`);
      } else {
          res.status(200).send(`Movie removed from ${Username}'s favorites`);
      }
  })
  .catch(err => {
      console.error(err);
      res.status(500).send('Error: ' + err);
  });
});

/**
 * Get all movies.
 * @name /movies
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.get('/movies', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.find()
  .then((movies) => {
    console.log(movies)
    res.status(201).json(movies);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});
// Add a route to get a user's favorite movies
app.get('/users/:Username/favoriteMovies', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const { Username } = req.params;

/**
 * Get a user's favorite movies.
 * @name /users/:Username/favoriteMovies
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.get('/users/:Username/favoriteMovies', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const { Username } = req.params;

  try {
    const user = await Users.findOne({ Username }).populate('FavoriteMovies');

    if (!user) {
      return res.status(404).send('User not found');
    }
    const favoriteMovies = user.FavoriteMovies.map(movie => {
      return {
        _id: movie._id,
        Title: movie.Title,
        Description: movie.Description,
        Genre: movie.Genre,
        Director: movie.Director,
        ReleaseYear: movie.ReleaseYear,
        ImagePath: movie.ImagePath
      };
    });

    res.json(favoriteMovies);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching favorite movies');
  }
});

/**
 * Get a movie by title.
 * @name /movies/:Title
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */

app.get('/movies/:Title', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.findOne({ Title: req.params.Title })
    .then((movies) => {
      res.json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/**
 * Get a genre by name.
 * @name /movies/genres/:genreName
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.get('/movies/genres/:genreName', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const movie = await Movies.findOne({ "Genre.Name": req.params.genreName });
    if (movie) {
      res.json(movie.Genre);
    } else {
      res.status(404).send('Genre not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error: " + err);
  }
});

/**
 * Get a movie by director.
 * @name /movies/directors/:directorName
 * @function
 * @memberof module:routes
 * @inner
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
app.get('/movies/directors/:directorName', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const movie = await Movies.findOne({ "Director.Name": req.params.directorName });
    if (movie) {
      res.json(movie.Director);
    } else {
      res.status(404).send('Director not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error: " + err);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});


/*// CREATE
app.post('/users', (req, res) => {
    const newUser = req.body;

    if (newUser.name) {
        newUser.id = uuid.v4();
        users.push(newUser);
        res.status(201).json(newUser)
    } else {
        res.status(400).send('users need names')
    }
    })

    //UPDATE
    app.put('/users/:id', (req, res) => {
        const { id } = req.params;
        const updatedUser = req.body;

        let user = users.find( user => user.id == id );

        if (user) {
            user.name = updatedUser.name;
            res.status(200).json(user);
        } else {
            res.status(400).send('no such user')
        }
        })

    //POST
    app.post('/users/:id/:movieTitle', (req, res) => {
        const { id, movieTitle } = req.params;
        
        let user = users.find( user => user.id == id );

        if (user) {
            user.favoriteMovies.push(movieTitle);
            res.status(200).send(`${movieTitle} has been added to user ${id}'s array`);
        } else {
            res.status(400).send('no such user')
        }
        })

    //DELETE
    app.delete('/users/:id/:movieTitle', (req, res) => {
        const { id, movieTitle } = req.params;
        
        let user = users.find( user => user.id == id );

        if (user) {
            user.favoriteMovies = user.favoriteMovies.filter( title => title !== movieTitle);
            res.status(200).send(`${movieTitle} has been removed from user ${id}'s array`);
        } else {
            res.status(400).send('no such user')
        }
        })

    //DELETE
    app.delete('/users/:id', (req, res) => {
        const { id } = req.params;
        
        let user = users.find( user => user.id == id );

        if (user) {
            users = users.filter( user => user.id != id);
            res.status (200).send(`user ${id} has been deleted`);
        } else {
            res.status(400).send('no such user')
        }
        })
// Add a route to get a user's favorite movies
app.get('/users/:Username/favoriteMovies', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const { Username } = req.params;

  try {
    // Find the user by username and populate the FavoriteMovies array with movie details
    const user = await Users.findOne({ Username }).populate('FavoriteMovies');

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Extract and return only necessary movie details
    const favoriteMovies = user.FavoriteMovies.map(movie => {
      return {
        _id: movie._id,
        Title: movie.Title,
        Description: movie.Description,
        Genre: movie.Genre,
        Director: movie.Director,
        ReleaseYear: movie.ReleaseYear,
        ImagePath: movie.ImagePath
        // Add more fields as needed
      };
    });

    res.json(favoriteMovies);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching favorite movies');
  }
});

// READ all movies
app.get('/movies', (req, res) => {
    res.status(200).json(movies);
});

// READ a specific movie by title
app.get('/movies/:title', (req, res) => {
    const { title } = req.params;
    const movie = movies.find(movie => movie.Title === title);

    if (movie) {
        res.status(200).json(movie);
    } else {
        res.status(404).send('Movie not found');
    }
});

// READ
app.get('/movies/genre/:genreName', (req, res) => {
  const { genreName } = req.params;
  const genre = movies.find( movie => movie.Genre.Name === genreName ).Genre;

  if (genre) {
      res.status(200).json(genre);
  } else {
      res.status(404).send('Genre not found');
  }
});

// READ
app.get('/movies/director/:directorName', (req, res) => {
    const { directorName } = req.params;
    // First, find a movie that matches the director name.
    const movie = movies.find(movie => movie.Director.Name === directorName);

    // If a movie is found, send the director info, otherwise send a 'Director not found' message.
    if (movie) {
        res.status(200).json(movie.Director);
    } else {
        res.status(404).send('Director not found');
    }
});*/

    






    



























/* // Set Content Security Policy middleware
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 'default-src * data:'); // Set your CSP rules here
  next();
});

// Log all requests
app.use(morgan('common'));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Define route for "/movies"
app.get('/movies', (req, res) => {
  // Sample data for top 10 movies
  const top10Movies = [
    { title: 'Harry Potter 1', rating: '5 stars' },
    { title: 'Harry Potter 2', rating: '5 stars' },
    { title: 'Harry Potter 3', rating: '5 stars' },
    { title: 'Harry Potter 4', rating: '5 stars' },
    { title: 'Harry Potter 5', rating: '5 stars' },
    { title: 'Harry Potter 6', rating: '5 stars' },
    { title: 'Harry Potter 7 Part 1', rating: '5 stars' },
    { title: 'Harry Potter 7 Part 2', rating: '5 stars' },
    { title: 'Pirates of the Caribbean', rating: '5 stars' },
    { title: 'The Pup rincess Bride', rating: '5 stars' },
    // Add data for the remaining movies
  ];

  // Send JSON response with top 10 movies
  res.json(top10Movies);
});

// Define default route
app.get('/', (req, res) => {
  res.send('Welcome to my MovieFlix!');
});

// Error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 8080; // Use the provided PORT environment variable or default to 8080
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
*/})
