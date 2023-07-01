const { error } = require('console');
const express = require('express')
const app = express()
const port = 2000
const jwt = require('jsonwebtoken');

// MongoDB setup
const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Bazli:Bazli35@cluster0.maezorf.mongodb.net/HotelVisitorManagement';


//const client = new MongoClient(uri);

let visitDetailCollection;
let securityCollection;
let hostCollection;
let adminCollection;


MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
.then(client => {
  console.log('Connected to MongoDB'); 
  const db = client.db('HotelVisitorManagement');
  //adminCollection = db.collection('adminCollection');
  visitDetailCollection = db.collection('visitDetailCollectionName');
  securityCollection = db.collection('securityCollectionName');
  hostCollection = db.collection('hostCollectionName');
  
  
  // Start the server or perform other operations

  const { ObjectId } = require('mongodb');

 async function login(reqUsername, reqPassword) {
   const client = new MongoClient(uri);
   try {
     await client.connect();

     // Validate the request payload
     if (!reqUsername || !reqPassword) {
       throw new Error('Missing required fields');
     }

     let matchuser = await hostCollection.findOne({ Username: reqUsername });

     if (!matchuser) {
       throw new Error('User not found!');
     }
     if (matchuser.Password === reqPassword) {
       const token = generateToken(matchuser);
       return {
        user: matchuser,
        token: token,
       };
     } else {
       throw new Error('Invalid password');
     }
   } catch (error) {
     console.error('Login Error:', error);
     throw new Error('An error occurred during login.');
   } finally {
     await client.close();
   }
  }

  async function register(reqUsername, reqPassword, reqName, reqEmail) {
   const client = new MongoClient(uri);
   try {
     await client.connect();


     // Validate the request payload
     if (!reqUsername || !reqPassword || !reqName || !reqEmail) {
       throw new Error('Missing required fields');
     }

     await hostCollection.insertOne({
       Username: reqUsername,
       Password: reqPassword,
       name: reqName,
       email: reqEmail,
     });

     return 'Registration Complete!!';
     } catch (error) {
     console.error('Registration Error:', error);
     throw new Error('An error occurred during registration.');
    } finally {
     await client.close();
   }
  }

  function generateToken(user) {
    const payload = {
      username: user.Username,
    };
    const token = jwt.sign(payload, 'inipassword', { expiresIn: '1h' });
    return token;
  }
  
  function verifyToken(req, res, next) {
    let header = req.headers.authorization;
    console.log(header);
  
    let token = header.split(' ')[1];
  
    jwt.verify(token, 'inipassword', function (err, decoded) {
      if (err) {
        return res.status(401).send('Invalid Token');
      }
  
      req.user = decoded;
      next();
    });
  }
  

  // Express setup
  app.use(express.json());


  app.post('/login', (req, res) => {
    console.log(req.body);

    login(req.body.Username, req.body.Password)
      .then((result) => {
        let token = generateToken(result);
        res.send(token);
      })
      .catch((error) => {
        res.status(400).send(error.message);
      });
  });

  app.post('/register', (req, res) => {
    console.log(req.body);

    register(req.body.Username, req.body.Password, req.body.name, req.body.email)
      .then((result) => {
        res.send(result);
      })
      .catch((error) => {
      res.status(400).send(error.message);
      });
  });


  app.post('/logout', (req, res) => {
    // Perform any logout-related tasks here
    res.send('Logout successful');
  });

 
  //Create
  app.post('/create-visit', async (req, res) => {
    try {
      const { visitorId, visitorName, gender, citizenship, visitorAddress, phoneNo, vehicleNo, hostId, visitDate,place , purpose } = req.body;

      // Ensure all required fields are present
      if (!visitorId || !visitorName || !gender || !hostId || !visitDate || !purpose || !place || !citizenship || !visitorAddress || !phoneNo || !vehicleNo) {
        throw new Error('Missing required fields');
      }

      const db = client.db('HotelVisitorManagement');
      const visitDetailCollection = db.collection('visitDetailCollectionName');

      // Insert the visit data into the visitDetailCollection
      const visitData = {
        visitorId,
        visitorName,
        gender,
        citizenship,
        visitorAddress,
        phoneNo,
        vehicleNo,
        hostId,
        visitDate,
        place,
        purpose
      };
      await visitDetailCollection.insertOne(visitData);

      res.send('Visit created successfully');
    } catch (error) {
      console.error('Error creating visit:', error);
      res.status(500).send('An error occurred while creating the visit');
    }
  });

 // Update visitor (only admin)
 app.patch('/update-visit/:visitId',verifyToken, (req, res) => {
  const visitId = req.params.visitId;
  const { visitorId, visitorName, gender, citizenship, visitorAddress, phoneNo, vehicleNo, hostId, visitDate, place, purpose } = req.body;

  if (!visitorId && !visitorName && !gender && !citizenship && !visitorAddress && !phoneNo && !vehicleNo && !hostId && !visitDate && !place && !purpose) {
    res.status(400).send('No fields provided for update');
    return;
  }

  const updateData = {};

  if (visitorId) updateData.visitorId = visitorId;
  if (visitorName) updateData.visitorName = visitorName;
  if (gender) updateData.gender = gender;
  if (citizenship) updateData.citizenship = citizenship;
  if (visitorAddress) updateData.visitorAddress = visitorAddress;
  if (phoneNo) updateData.phoneNo = phoneNo;
  if (vehicleNo) updateData.vehicleNo = vehicleNo;
  if (hostId) updateData.hostId = hostId;
  if (visitDate) updateData.visitDate = visitDate;
  if (place) updateData.place = place;
  if (purpose) updateData.purpose = purpose;

  visitDetailCollection
    .findOneAndUpdate({ _id: new ObjectId(visitId) }, { $set: updateData })
    .then((result) => {
      if (!result.value) {
        // No matching document found
        throw new Error('Visit not found');
      }
      res.send('Visit updated successfully');
    })
    .catch((error) => {
      console.error('Error updating visit:', error);
      if (error.message === 'Visit not found') {
        res.status(404).send('Visit not found');
      } else {
        res.status(500).send('An error occurred while updating the visit');
      }
    });
});



  // Delete visit (only admin)
  app.delete('/delete-visit/:visitDetailId',verifyToken, (req, res) => {
    const visitDetailId = req.params.visitDetailId;
  
    visitDetailCollection
      .deleteOne({ _id: new ObjectId(visitDetailId) })
      .then(() => {
        res.send('Visit detail deleted successfully');
      })
      .catch((error) => {
        console.error('Error deleting visit detail:', error);
        res.status(500).send('An error occurred while deleting the visit detail');
      });
  });
  
  // Read visit details (only admin)
    
  app.get('/visit-details',verifyToken, (req, res) => {
    visitDetailCollection
      .find({})
      .toArray()
      .then((visitDetails) => {
        res.json(visitDetails);
      })
      .catch((error) => {
        console.error('Error retrieving visit details:', error);
        res.status(500).send('An error occurred while retrieving visit details');
      });
  });

  app.post('/register-security', (req, res) => {
    const { name, id, workshift, duration, date } = req.body;
  
    // Validate the request payload
    if (!name || !id || !workshift || !duration || !date) {
      res.status(400).send('Missing required fields');
      return;
    }
  
    securityCollection
      .insertOne({ name, id, workshift, duration, date })
      .then(() => {
        res.send('Security guard registered successfully');
      })
      .catch((error) => {
        console.error('Error registering security guard:', error);
        res.status(500).send('An error occurred while registering the security guard');
      });
  });
  

  app.post('/login-security', (req, res) => {
    console.log(req.body);
  
    const { id, name } = req.body;
  
    // Validate the request payload
    if (!id || !name) {
      res.status(400).send('Missing required fields');
      return;
    }
  
    securityCollection
      .findOne({ id, name })
      .then((guard) => {
        if (!guard) {
          res.status(401).send('Invalid credentials');
          return;
        }
  
        // Generate a token for authentication
        const token = generateToken(guard);
  
        res.send(token);
      })
      .catch((error) => {
        console.error('Error during security guard login:', error);
        res.status(500).send('An error occurred during login');
      });
  });
  


  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
})
  .catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});



