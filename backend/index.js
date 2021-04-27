const mongoose = require('mongoose');
const Document = require('./document');
const dotenv = require('dotenv');
dotenv.config();

//Connect to database
const connectDB = async () => {
	try {
		const conn = await mongoose.connect(process.env.MONGO_URI, {
			useCreateIndex: true,
			useUnifiedTopology: true,
			useNewUrlParser: true,
			useFindAndModify: false,
		});
		console.log('Connected to database');
	} catch (err) {
		console.log(`Error ${err.message}`);
		process.exit(1);
	}
};

connectDB();

const io = require('socket.io')(3001, {
	cors: {
		origin: 'http://localhost:3000',
		methods: ['GET', 'POST'],
	},
});

const defaultValue = '';

io.on('connection', (socket) => {
	console.log(socket.id, ' connected');

	socket.on('get-document', async (documentId) => {
		const documents = await findOrCreateDocument(documentId);
		socket.join(documentId); //Joins a room with name of the documentId sent

		socket.emit('load-document', documents.data);

		socket.on('send-changes', (delta) => {
			socket.broadcast.to(documentId).emit('receive-changes', delta);
		});

		socket.on('save-document', async (data) => {
			await Document.findByIdAndUpdate(documentId, { data });
		});
	});
});

async function findOrCreateDocument(id) {
	if (id == null) return;

	const docs = await Document.findById(id);
	if (docs) return docs;
	const newDocs = await Document.create({ _id: id, data: defaultValue });
	return newDocs;
}
