import React from 'react';
import { Breadcrumb } from 'react-bootstrap';
import { useGraph } from '../../context/GraphContext';
import './BreadcrumbNav.css';

const BreadcrumbNav = ({ loadSupernodeData }) => {
  const { 
    breadcrumbPath, 
    setBreadcrumbPath, 
    setCurrentSupernode,
    dataset,
    k
  } = useGraph();

  const navigateViaBreadcrumb = (index) => {
    if (index >= 0 && index < breadcrumbPath.length) {
      // Get the supernode at the specified index
      const targetSupernode = breadcrumbPath[index].id;
      
      // Update the breadcrumb path (truncate to the selected index)
      setBreadcrumbPath(breadcrumbPath.slice(0, index + 1));
      
      // Navigate to the selected supernode
      setCurrentSupernode(targetSupernode);
      
      // Load the supernode data using the passed function
      if (dataset && targetSupernode) {
        loadSupernodeData(targetSupernode);
      }
    }
  };

  return (
    <div className="breadcrumb-navigation">
      <Breadcrumb>
        {breadcrumbPath.map((item, index) => (
          <Breadcrumb.Item 
            key={index}
            active={index === breadcrumbPath.length - 1}
            onClick={() => navigateViaBreadcrumb(index)}
            className={index === breadcrumbPath.length - 1 ? "active-crumb" : "clickable-crumb"}
          >
            {item.label}
          </Breadcrumb.Item>
        ))}
      </Breadcrumb>
    </div>
  );
};

export default BreadcrumbNav;