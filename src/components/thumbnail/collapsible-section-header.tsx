import * as React from "react";
import "./collapsible-section-header.sass";

interface IProps {
  className?: string;
  sectionTitle: string;
  dataTestName: string;
  isExpanded: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const CollapsibleSectionHeader = (props: IProps) => {
  const { className, sectionTitle, dataTestName, isExpanded, onClick } = props;
  const icon: string = isExpanded ? "#icon-down-arrow" : "#icon-right-arrow";
  return (
    <div
      className={`section-header ${className || ""} ${isExpanded ? "expanded" : "collapsed"}`}
      data-test={dataTestName}
      onClick={onClick} >

      <svg className="icon">
        <use xlinkHref={icon}/>
      </svg>
      <div className="title" title={sectionTitle}>{sectionTitle}</div>
    </div>
  );
};
