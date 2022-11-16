import express from 'express';
import bodyParser from 'body-parser';
import knex from 'knex';
import bcrypt from 'bcrypt';
import cors from 'cors';


const postgres = knex ({
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      port: 5433,
      user: 'postgres',
      password: 'kuchnahi',
      database: 'quora'
    }
  });

console.log(postgres.select('*').from('users'));

var app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World')
})

/* Getting user Profile */
app.get('/profile/:id', (req, res) => {
    const {id} = req.params;
    postgres.select('*').from('users').where({id})
    .then(user => {
      if (user.length) {
        res.json(user)
      }
      else {
        res.status(400).json('Error Getting User')
      }
    })
    .catch(err => res.status(400).json('User not found'))
})


app.post('/register', (req, res) => {
  const {fname, lname, email, designation, field, password, id} = req.body;
  if (!fname || !email || !password || !designation) {
    return res.status(400).json("Empty Fields")
  }
  console.log(fname, lname, email, designation, field, password, id);
  //const hash = bcrypt.hashSync(password);
  const hash = bcrypt.hashSync(password, 10)
  console.log(hash);
  postgres.transaction(trx => {
    trx.insert({
      login_id: id,
      username: email,
      user_password: hash
    })
    .into('login')
    .returning('username')
    .then(loginEmail => {
       return trx('users')
       .returning('*')
       .insert({
         id: id,
         email: loginEmail[0],
         fname: fname,
         lname: lname,
         designation: designation,
         field: field
       }
       )
       .then(user => {
         console.log(user)
         res.json(user[0]);
       })
    })
    .then(trx.commit)
    .catch(trx.rollback)
  })
  .catch(err => console.log(err))
})

app.post('/signin', (req, res) => {
  postgres.select('username', 'user_password')
  .from('login')
  .where('username', '=', req.body.email)
  .then(data => {
    const isValid = bcrypt.compareSync(req.body.password, data[0].user_password)
    if (isValid) {
      return postgres.select('*').from('users')
      .where('email', '=', req.body.email)
      .then(user => {
       res.json(user[0])
      })
      .catch(err => res.status(400).json('unable to register'))
    }
    else{
      res.status(400).json("wrong credentials")
    }
  })
  .catch(err => res.status(400).json('wrong credentials'));
})

app.post('/creategroup', (req, res) => {
  const {group_id, group_name, group_field} = req.body
  if (!group_name ){
    return res.status(400).json("Enter group name")
  }
  postgres('groups').insert({
    group_id: group_id,
    group_name: group_name,
    group_field: group_field
  })
  .then(group => {
    res.json(group[0])
  }
  )
  .catch(err => console.log(err))
})

app.post('/ask_question', (req,res) => {
  const {que_id, group_id, user_id, que_content} = req.body;
  if (!que_id || !group_id || !user_id || !que_content){
    return res.status(400).json("Empty Fields")
  }
  postgres('questions').insert({
    que_id: que_id,
    group_id: group_id,
    user_id: user_id,
    que_content: que_content
  })
  .then(
    res.json(que_content)
  )
  .catch(err => res.status(400).json(err))
})

app.post('/followinggroups', (req, res) => {
  const {id} = req.body;
  /*postgres.select('group_id').from('role').where({user_id : id})
  .then(groupids => {
    postgres.select('group_name').from('groups').where({group_id: groupids})
    .then(groupnames => {
      res.json(groupnames)
    })
    .catch(err => res.status(400).json("error getting groups"))
  })
  .catch(err => res.status(400).json(err))*/
  const subquery = postgres.select('group_id').from('role').where({user_id : id})
  postgres.select('*').from('groups').whereIn('group_id', subquery)
  .then(group => {
       res.json(group)
  }
  )
  .catch(err => res.status(400).json(err));
})

app.post('/groupstofollow', (req, res) => {
  const {id} = req.body;
  const subquery = postgres.select('group_id').from('role').where({user_id: id})
    postgres.select('*').from('groups').whereNotIn('group_id', subquery)
  .then(
    groupnames => {
      res.json(groupnames)
    }
  )
  .catch(err => res.status(400).json(err))
})


app.post('/getques', (req, res) => {
  console.log(req.body)
  const {id} = req.body;
  const subquery = postgres.select('group_id').from('role').where({user_id : id})
  postgres.select('*').from('questions').whereIn('group_id', subquery)
  .then (
    question => {
      res.json(question)
      console.log(question)
    }
  )
  .catch(err => res.status(400).json(err))
})


app.post('/groupdetails', (req, res) => {
  const {id} = req.body;
  const subquery = postgres.select('user_id').from('role').where({group_id: id})
  postgres.select('*').from('users').whereIn('id', subquery)
  .then (
    user => {
      res.json(user)
    }
  )
  .catch(err => res.status(400).json(err))
})
/*
app.post('/getadmin', (req, res) => {
  const {id} = req.body;
  postgres.select('user_id').from('role').where({group_id: id})

})

app.post('/unfollow', (req, res) => {
  const id = req.body;

})
*/
app.post('/groupquestions', (req, res) => {
  const {id} = req.body;
  postgres.select('*').from('questions').where('group_id', id)
  .then(
    question => {
      res.json(question)
    }
  )
  .catch(err => res.status(400).json(err))
})
app.post('/getanswer', (req, res) => {
  const {id} = req.body;
  postgres.select('*').from('answers').where('que_id', id)
  .then(
    answer => {
      res.json(answer)
    }
  )
  .catch(err => res.status(400).json(err))
})

app.post('/answer', (req, res) => {
  const {ans_id, que_id, user_id, ans_content} = req.body;
  if (!ans_id || !que_id || !user_id || !ans_content){
    return res.status(400).json("Empty Fields")
  }
    postgres('answers').insert({
    ans_id: ans_id,
    que_id: que_id,
    user_id: user_id,
    ans_content: ans_content
  })
  .then(
    res.json(ans_content)
  )
  .catch(err => res.status(400).json(err))
})

app.post('/follow', (req, res) => {
  const {user_id, group_id} = req.body;
  postgres('role').insert({
    user_id: user_id,
    group_id: group_id,
    role: 'viewer'
  })
  .then(
    res.json(group_id)
  )
  .catch(err => res.status(400).json(err))
})


app.post('/unfollow', (req, res) => {
  const {user_id, group_id} = req.body;
  postgres('role').where({
    user_id: user_id,
    group_id: group_id
  }).select('*').del()
  .then(
    group => {
      res.json("Group Unfollowed")
    }
  )
  .catch(err => res.status(400).json(err))
})


app.post('/getgroupname', (req, res) => {
  const {id} = req.body;
  postgres.select('group_name').from('groups').where('group_id', id)
  .then(
    answer => {
      res.json(answer)
    }
  )
  .catch(err => res.status(400).json(err))
})

app.post('/getusername', (req, res) => {
  const {id} = req.body;
  postgres.select('*').from('users').where('id', id)
  .then(
    answer => {
      res.json(answer)
    }
  )
  .catch(err => res.status(400).json(err))
})
app.listen(3000);