const express = require('express');
const app = express();

const bodyParser = require('body-parser');

const jwt = require('jsonwebtoken');

const dotenv = require('dotenv')
dotenv.config({path:__dirname+'/.env'});

const mongoose = require('mongoose');
/* MIDDLEWARE  */

// Load in mongoose models
const { Kapal, Task, User } = require('./db/models');

// Load middlware
app.use(bodyParser.json());


// CORS HEADER MIDDLEWARE
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");

    res.header (
        "Access-Control-Expose-Headers",
        "x-access-token, x-refresh-token"
    );
    
    next();
  });


// check whether the request has a valid JWT access token
let authenticate = (req, res, next) => {
    let token = req.header('x-access-token');

    // verify the JWT
    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if (err) {
            // there was an error
            // jwt is invalid - * DO NOT AUTHENTICATE *
            res.status(401).send(err);
        } else {
            // jwt is valid
            req.user_id = decoded._id;
            next();
        }
    });
}

// Verify Refresh Token Middleware (which will be verifying the session)
let verifySession = (req, res, next) => {
    // grab the refresh token from the request header
    let refreshToken = req.header('x-refresh-token');

    // grab the _id from the request header
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user) {
            // user couldn't be found
            return Promise.reject({
                'error': 'User not found. Make sure that the refresh token and user id are correct'
            });
        }


        // if the code reaches here - the user was found
        // therefore the refresh token exists in the database - but we still have to check if it has expired or not

        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                // check if the session has expired
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    // refresh token has not expired
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            // the session is VALID - call next() to continue with processing this web request
            next();
        } else {
            // the session is not valid
            return Promise.reject({
                'error': 'Refresh token has expired or the session is invalid'
            })
        }

    }).catch((e) => {
        res.status(401).send(e);
    })
}

/* END MIDDLEWARE  */

// ROUTE HANDLERS


// LIST ROUTES

// GET /list
// Purpose: Get all lists
app.get('/kapal', authenticate, (req, res) => {
    // we want to return an array of all the lists in the database
    Kapal.find({
        _userId: req.user_id
    }).then((lists) => {
    res.send(lists);
    })
    .catch((err) => {
    console.log(err);
    })
    
});

// GET /kapal/:listId
// Purpose: Get list by id
app.get('/kapal/:id', authenticate, (req, res) => {
    // We want to return one list by id
    Kapal.findOne({
        _id: req.params.id, 
        _userId: req.user_id 
    }).then((lists) => {
        res.send(lists);
    })
});


// POST /list
// Purpose: Create a list
app.post('/kapal', authenticate, (req, res) => {
    // We want to create a new list and return the new list document back to the user (which includes the id)
    // The list information (fields) will be passed in via the JSON request body
    console.log(req,'req');
    let title = req.body.title;
    let namaKapal = req.body.namaKapal;
    let jumlahMuatan = req.body.jumlahMuatan;

    let newList = new Kapal ({
        title,
        namaKapal,
        jumlahMuatan,
        _userId: req.user_id
    });
    newList.save().then((listDoc) => {
        // the full list document is returned (incl. id)
        res.send(listDoc);
    })
});

// PATCH /list/:id
// Purpose: Update a specified list
app.patch('/kapal/:id', authenticate, (req, res) => {
    // We want to update the specified list (list document with id in the URL) with the new values specified in the JSON body of the request
    Kapal.findOneAndUpdate({ _id: req.params.id, _userId: req.user_id }, {
        $set: req.body
    }).then(() => {
        res.send({ 'message': 'updated successfully'});
    });
});

// DELETE /list/:id
// Purpose: Delete a list
app.delete('/kapal/:id', authenticate, (req, res) => {
    // We want to delete the specified list (document with id in the URL)
    
    Kapal.findOneAndRemove({
        _id: req.params.id,
        _userId: req.user_id
    }).then((removedListDoc) => {
        res.send(removedListDoc);

        // delete all the tasks that are in the deleted list
        deleteTasksFromList(removedListDoc._id);
    })
});


// GET /kapal/:listId/tasks
// Purpose: Get all tasks in a specific list
app.get('/kapal/:listId/tasks', authenticate, (req, res) => {
    // We want to return all tasks that belong to a specific list (specified by listId)
    Task.find({
        _listId: req.params.listId
    }).then((tasks) => {
        res.send(tasks);
    })
});

// GET /kapal/:listId/tasks/:taskId
// Purpose: Get tasks by task id
app.get('/kapal/:listId/tasks/:taskId', authenticate, (req, res) => {
    // We want to return tasks by id that belong to a specific list (specified by listId)
    Task.findOne({
        _id: req.params.taskId,
        _listId: req.params.listId
    }).then((tasks) => {
        console.log('t',tasks);
        res.send(tasks);
    })
});

// POST /list/:listId/tasks
// Purpose: Create a new task in a specific list
app.post('/kapal/:listId/tasks', authenticate, (req, res) => {
    // We want to create a new task in a list specified by listId

    Kapal.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            // list object with the specified conditions was found
            // therefore the currently authenticated user can create new tasks
            return true;
        }

        // else - the list object is undefined
        return false;
    }).then((canCreateTask) => {
        if (canCreateTask) {
            let newTask = new Task({
                title: req.body.title,
                tanggal: req.body.tanggal,
                waktuMulai: req.body.waktuMulai,              
                waktuSelesai: req.body.waktuSelesai,              
                _listId: req.params.listId
            });
            newTask.save().then((newTaskDoc) => {
                res.send(newTaskDoc);
            })
        } else {
            res.sendStatus(404);
        }
    })
})



// PATCH /list/:listId/tasks/:taskId
// Purpose: Update an existing task
app.patch('/kapal/:listId/tasks/:taskId', authenticate, (req, res) => {
    // We want to update an existing task (specified by taskId)

    Kapal.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            // list object with the specified conditions was found
            // therefore the currently authenticated user can make updates to tasks within this list
            return true;
        }

        // else - the list object is undefined
        return false;
    }).then((canUpdateTasks) => {
        if (canUpdateTasks) {
            // the currently authenticated user can update tasks
            Task.findOneAndUpdate({
                _id: req.params.taskId,
                _listId: req.params.listId
            }, {
                    $set: req.body
                }
            ).then(() => {
                res.send({ message: 'Updated successfully.' })
            })
        } else {
            res.sendStatus(404);
        }
    })
});

// DELETE /list/:listId/tasks/:taskId
// Purpose: Delete a task
app.delete('/kapal/:listId/tasks/:taskId', authenticate, (req, res) => {

    Kapal.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            // list object with the specified conditions was found
            // therefore the currently authenticated user can make updates to tasks within this list
            return true;
        }

        // else - the list object is undefined
        return false;
    }).then((canDeleteTasks) => {
        
        if (canDeleteTasks) {
            Task.findOneAndRemove({
                _id: req.params.taskId,
                _listId: req.params.listId
            }).then((removedTaskDoc) => {
                res.send(removedTaskDoc);
            })
        } else {
            res.sendStatus(404);
        }
    });
});

// //Get detail task
// app.get('/kapal/:listId/tasks/:taskId', (req, res) => {
//     Task.findOne({
//         _id: req.params.taskId,
//         _listId: req.params.listId
//     }).then((tasks) => {
//     res.send(tasks);
//     })
//     .catch((err) => {
//     console.log(err);
//     })
    
// })


/* USER ROUTES */

/**
 * POST /users
 * Purpose: Sign up
 */
 app.post('/users', (req, res) => {
    // User sign up

    let body = req.body;
    let newUser = new User(body);

    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        // Session created successfully - refreshToken returned.
        // now we geneate an access auth token for the user

        return newUser.generateAccessAuthToken().then((accessToken) => {
            // access auth token generated successfully, now we return an object containing the auth tokens
            return { accessToken, refreshToken }
        });
    }).then((authTokens) => {
        // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    })
})


/**
 * POST /users/login
 * Purpose: Login
 */
app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            // Session created successfully - refreshToken returned.
            // now we geneate an access auth token for the user

            return user.generateAccessAuthToken().then((accessToken) => {
                // access auth token generated successfully, now we return an object containing the auth tokens
                return { accessToken, refreshToken }
            });
        }).then((authTokens) => {
            // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    });
})


/**
 * GET /users/me/access-token
 * Purpose: generates and returns an access token
 */
app.get('/users/me/access-token', verifySession, (req, res) => {
    // we know that the user/caller is authenticated and we have the user_id and user object available to us
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });
})

/* HELPER METHODS */
let deleteTasksFromList = (_listId) => {
    Task.deleteMany({
        _listId
    }).then(() => {
        console.log("Tasks from " + _listId + " were deleted!");
    })
}


const port = process.env.PORT || 3000;
// app.listen(port, () => {
//     console.log("Server is listening on port 3000");
// }) 
mongoose.connect(process.env.MONGODB_URL).then(() => {
    console.log("Mongodb connected");
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  }).catch((err) => {
    console.log({ err });
    process.exit(1);
  });