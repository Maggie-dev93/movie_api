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

/*const cors = require('cors');
app.use(cors());*/

const cors = require('cors');
const allowedOrigins = ['http://localhost:8080', 'http://localhost:1234', 'https://movies-flixmcn-ed96d6a64be1.herokuapp.com'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('The CORS policy for this application does not allow access from the specified origin.'));
    }
  }
}));

const auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

//test default
app.get("/", (req, res) => {
    res.send("Welcome to MyFlix!");
});

//Add a user
/* We’ll expect JSON in this format
{
  ID: Integer,
  Username: String,
  Password: String,
  Email: String,
  BirthDate: Date
}*/


/* POST login. */
/* POST endpoint to add a new user */

/* POST login. */
app.post('/login',
  [
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Username contains non-alphanumeric characters not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
  ], 
  async (req, res) => {
    // Check the validation object for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { Username, Password } = req.body;

    try {
      // Find the user by username
      const user = await Users.findOne({ Username });
      if (!user) {
        return res.status(400).send('Username or password is incorrect');
      }

      // Compare the hashed password
      const isMatch = await bcrypt.compare(Password, user.Password);
      if (!isMatch) {
        return res.status(400).send('Username or password is incorrect');
      }

      // User is authenticated successfully
      res.status(200).json({ message: 'Login successful', user });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  }
);

app.post('/users', 
  // Validation logic here for request
  [
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], async (req, res) => {
  // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    await Users.findOne({ Username: req.body.Username }) // Search to see if a user with the requested username already exists
      .then((user) => {
        if (user) {
        //If the user is found, send a response that it already exists
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

   // Get all users
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
  // Get a user by username
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

  // Update a user's info, by username
/* We’ll expect JSON in this format
{
  Username: String,
  (required)
  Password: String,
  (required)
  Email: String,
  (required)
  BirthDate: Date
}*/
app.put('/users/:Username', [
  //input validation here
  check('Username', 'Username is required').isLength({min: 5}),
  check('Username', 'Username contains non alphanumeric characters not allowed.').isAlphanumeric(),
  check('Password', 'Password is required').not().isEmpty(),
  check('Email', 'Email does not appear to be valid').isEmail()
], passport.authenticate('jwt', {session: false}), async (req, res) => {

    //check validation object for errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({errors: errors.array()});
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
  await Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
    {
      Username: req.body.Username,
      Password: hashedPassword,
      Email: req.body.Email,
      BirthDate: req.body.BirthDate
    }
  },
  { new: true }) // This line makes sure that the updated document is returned
  .then((updatedUser) => {
    res.json(updatedUser);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  })

});

// Add a movie to a user's list of favorites
app.post('/users/:Username/movies/:MovieTitle', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Users.findOneAndUpdate({ Username: req.params.Username }, {
     $push: { FavoriteMovies: req.params.MovieTitle }
   },
   { new: true }) // This line makes sure that the updated document is returned
  .then((updatedUser) => {
    res.json(updatedUser);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

// Delete a user by username
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

// Allow users to remove a movie from their list of favorites
app.delete('/users/:Username/movies/:MovieTitle', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const { Username, MovieTitle } = req.params;
  await Users.findOneAndUpdate(
      { Username: Username },
      { $pull: { FavoriteMovies: MovieTitle } },
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

//MOVIES
// Get all movies
// Get all movies
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

// Get a movie by title
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

// Get a genre by name
app.get('/movies/genres/:genreName', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // Find a movie with the specified genre name
    const movie = await Movies.findOne({ "Genre.Name": req.params.genreName });
    if (movie) {
      // If a movie is found, return the genre information
      res.json(movie.Genre);
    } else {
      // If no movie is found, return a not found message
      res.status(404).send('Genre not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error: " + err);
  }
});

// Get a movie by director
app.get('/movies/directors/:directorName', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // Find a movie with the specified genre name
    const movie = await Movies.findOne({ "Director.Name": req.params.directorName });
    if (movie) {
      // If a movie is found, return the genre information
      res.json(movie.Director);
    } else {
      // If no movie is found, return a not found message
      res.status(404).send('Director not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error: " + err);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
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
*/