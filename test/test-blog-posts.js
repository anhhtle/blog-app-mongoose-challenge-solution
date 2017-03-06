//require
const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

//seeding DB
function seedPostsData() {
    console.info('seeding blog data');
    let seedData = [];
    for(let i = 0; i < 10; i++){
        const item = {
            author: {
                firstName: faker.name.findName(),
                lastName: faker.name.lastName()
            },
            title: faker.lorem.sentence(),
            content: faker.lorem.text()
        }; // end item
        seedData.push(item);
    }; //end for

    return BlogPost.insertMany(seedData);
};

//tear down to reset test DB
function tearDownDb() {
    return new Promise((resolve, reject) => {
        console.warn('Deleting database');
        mongoose.connection.dropDatabase()
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
};

//testing
describe('blog post API testing', function(){

    before(function(){
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function(){
        return seedPostsData();
    });

    afterEach(function(){
        return tearDownDb();
    });

    after(function(){
        return closeServer();
    });

    describe('GET endpoint', function(){
        it('should return all posts', function(){
            let res;
            return chai.request(app)
            .get('/posts')
            .then(_res => {
                res = _res;
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.be.a('array');
                res.body.should.have.length.of.at.least(1);
                return BlogPost.count();
            })
            .then(count => {
                res.body.should.have.length.of(count);
            });
        }); // end it

        it('should return post with right fields', function(){
            let resPost;
            return chai.request(app)
            .get('/posts')
            .then(res => {
                res.body.forEach(post => {
                    post.should.be.a('object');
                    post.should.include.keys('id', 'author', 'title', 'content', 'created');
                });
                resPost = res.body[0];
                return BlogPost.findById(resPost.id).exec();
            }) //compare singular post
            .then(res => {
                res.title.should.equal(resPost.title);
                res.authorName.should.equal(resPost.author);
                res.content.should.equal(resPost.content);
            });
        }) // end it

    }) // end GET

    describe('POST endpoint', function(){
        it('should create new post', function(){
            const newItem = {
                author: {
                    firstName: faker.name.firstName(),
                    lastName: faker.name.lastName()
                },
                title: faker.lorem.sentence(),
                content: faker.lorem.text()
            };
            return chai.request(app)
            .post('/posts')
            .send(newItem)
            .then(res => {
                res.should.have.status(201);
                res.should.be.json;
                res.body.should.be.a('object');
                res.body.should.include.keys('id', 'author', 'title', 'content', 'created');
                res.body.id.should.not.be.null;
                //compare respond with newItem
                res.body.author.should.equal(`${newItem.author.firstName} ${newItem.author.lastName}`);
                res.body.title.should.equal(newItem.title);
                res.body.content.should.equal(newItem.content);
                return BlogPost.findById(res.body.id).exec();
            }) //compare DB item with newItem
            .then(res => {
                res.author.firstName.should.equal(newItem.author.firstName);
                res.author.lastName.should.equal(newItem.author.lastName);
                res.title.should.equal(newItem.title);
                res.content.should.equal(newItem.content);
            });

        }); // end it
    }); // end POST

    describe('PUT endpoint', function(){
        const updateItem = {
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
            },
            title: faker.lorem.sentence(),
            content: faker.lorem.text()
        };

        it('should update post', function(){
            //find item ID to update
            BlogPost
            .findOne()
            .exec()
            .then(post => {
                updateItem.id = post.id;
                //send PUT
                return chai.request(app)
                .put(`/posts/${post.id}`)
                .send(updateItem);
            })
            .then(res => {
                res.should.have.status(201);
                res.should.be.json;
                res.body.should.be.a('object');
                res.body.should.include.keys('id', 'author', 'title', 'content', 'created');
                //compare res with updateItem
                res.body.author.should.equal(`${updateItem.author.firstName} ${updateItem.author.lastName}`);
                res.body.title.should.equal(updateItem.title);
                res.body.content.should.equal(updateItem.content);
                return BlogPost.findById(res.body.id).exec();
            }) //compare DB item with updateItem
            .then(post => {
                post.author.firstName.should.be.equal(updateItem.author.firstName);
                post.author.lastName.should.be.equal(updateItem.author.lastName);
                post.title.should.equal(updateItem.title);
                post.content.should.equal(updateItem.content);
            })
        }); // end it
    }) // end PUT

    describe('DELETE endpoint', function(){
        it('should delete post', function(){
            let post;
            //find ID to delete
            BlogPost
            .findOne()
            .exec()
            .then(_post => {
                post = _post;
                return chai.request(app)
                .delete(`/posts/${post.id}`);
            })
            .then(res => {
                res.should.have.status(204);
                return BlogPost.findById(post.id);
            })
            .then(_post => {
                should.not.exist(_post);
            });
        });
    }) // end DELETE

}) // end TEST describe