// src/components/Layout/Header.js
import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { useGraph } from '../../context/GraphContext';
import FileUpload from '../FileUpload/FileUpload';
import './Header.css';

const Header = () => {
  const { fileUploaded } = useGraph();

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand href="#home">PPRviz Graph Visualization</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {!fileUploaded && (
              <FileUpload />
            )}
            <Nav.Link href="https://github.com/yourusername/pprviz-frontend" target="_blank">GitHub</Nav.Link>
            <Nav.Link href="#help">Help</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;