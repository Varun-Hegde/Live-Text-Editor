import React, { useCallback, useEffect, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { io } from 'socket.io-client';
import { useParams } from 'react-router-dom';
const SAVE_INTERVAL_MS = 5000;

const TextEditor = () => {
	const [socket, setSocket] = useState();
	const [quill, setQuill] = useState();

	const { id: documentId } = useParams();

	const TOOLBAR_OPTIONS = [
		[{ header: [1, 2, 3, 4, 5, 6, false] }],
		[{ font: [] }],
		[{ list: 'ordered' }, { list: 'bullet' }],
		['bold', 'italic', 'underline'],
		[{ color: [] }, { background: [] }],
		[{ script: 'sub' }, { script: 'super' }],
		[{ align: [] }],
		['image', 'blockquote', 'code-block'],
		['clean'],
	];

	//Socket connection
	useEffect(() => {
		const s = io('http://localhost:3001');

		setSocket(s);
		return () => {
			s.disconnect();
		};
	}, []);

	//Save to database after every 5 seconds
	useEffect(() => {
		if (socket == null || quill == null) return;

		const interval = setInterval(() => {
			socket.emit('save-document', quill.getContents());
		}, SAVE_INTERVAL_MS);

		return () => {
			clearInterval(interval);
		};
	}, [socket, quill]);

	//Load the document data
	useEffect(() => {
		if (socket == null || quill == null) return;

		//Only listen once,event listener will get cleared after listening to this event once
		socket.once('load-document', (documents) => {
			quill.setContents(documents);
			quill.enable();
		});

		socket.emit('get-document', documentId);
	}, [socket, quill, documentId]);

	//Receiving changes from server
	useEffect(() => {
		if (socket == null || quill == null) return;

		const handler = (delta) => {
			quill.updateContents(delta);
		};
		socket.on('receive-changes', handler);

		return () => {
			socket.off('receive-changes', handler);
		};
	}, [socket, quill]);

	//Whenever quill changes
	useEffect(() => {
		if (socket == null || quill == null) return;

		const handler = (delta, oldDelta, source) => {
			if (source !== 'user') return;

			socket.emit('send-changes', delta);
		};
		quill.on('text-change', handler);

		return () => {
			quill.off('text-change', handler);
		};
	}, [socket, quill]);

	const wrapperRef = useCallback((wrapper) => {
		if (wrapper == null) return;

		wrapper.innerHTML = '';
		const editor = document.createElement('div');
		wrapper.append(editor);
		const q = new Quill(editor, {
			theme: 'snow',
			modules: { toolbar: TOOLBAR_OPTIONS },
		});
		q.disable();
		q.setText('Loading........');
		setQuill(q);
		// eslint-disable-next-line
	}, []);
	return <div className="container" ref={wrapperRef}></div>;
};

export default TextEditor;
