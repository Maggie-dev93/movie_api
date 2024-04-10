const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');

// Initialize your express application
const app = express();

app.use(bodyParser.json());

let users = [
    {
        id: 1,
        name: "Maggie",
        favoriteMovies: []
    },
    {
        id: 2,
        name: "Ian",
        favoriteMovies: ["Pirates of the Caribbean"]
    },
];

let movies = [
    {
        "Title": "Pirates of the Caribbean",
        "Description": "In this swashbuckling tale, Captain Jack Sparrow, played by the charismatic Johnny Depp, makes an unexpected entrance into Port Royal, where he finds himself shipless and crewless. However, his arrival coincides with a perilous event: the town is soon attacked by a notorious pirate ship.Amidst the chaos, the pirates seize the governor's daughter, Elizabeth, portrayed by the talented Keira Knightley. Little do they know, Elizabeth possesses a valuable coin tied to a curse that has rendered the pirates undead. In a daring adventure, a courageous blacksmith, played by Orlando Bloom, who harbors feelings for Elizabeth, joins forces with Sparrow to pursue the pirates and unravel the mystery surrounding the cursed treasure.",
        "Genre": {
            "Name": "Action",
            "Description": "featuring characters involved in exciting and usually dangerous activities and adventures.",
            "Release Date": "August 2003",
        },
        "Director": {
            "Name": "Gore Verbinski",
            "Bio": "Gore Verbinski is an American film director and writer, best known for directing the first three Pirates of the Caribbean films and The Ring.",
            "Birth": "March 16, 1964",
        }
    },
    {
        "Title": "The Princess Bride",
        "Description": "While home sick, a boys grandfather reads him the story of a farmboy-turned-pirate who encounters numerous obstacles, enimies and allies in his quest to be reunited with his one true love.",
        "Genre": {
            "Name": "Action",
            "Description": "featuring characters involved in exciting and usually dangerous activities and adventures.",
            "Release Date": "August 2003",
        },
        "Director": {
            "Name": "Rob Reiner",
            "Bio": "Rob Reiner is a renowned American director, known for his iconic contributions to cinema including The Princess Bride and When Harry Met Sally..",
            "Birth": "MMarch 6, 1947",
        }
    },
];

// CREATE
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
});


app.listen(8080, () => console.log("listening on 8080"));



    






    



























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