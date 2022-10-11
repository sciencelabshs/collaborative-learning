import { observer } from "mobx-react";
import React, {useState} from "react";
import ChatIcon from "../../assets/chat-icon.svg";
import NotificationIcon from "../../assets/notifications-icon.svg";
import DocumentsWithCommentsIcon  from "../../assets/documents-list-icon.svg";

import "./chat-panel-header.scss";
import "../themes.scss";

interface IProps {
  activeNavTab: string;
  newCommentCount: number;
  onCloseChatPanel:(show:boolean) => void;
}

export const ChatPanelHeader: React.FC<IProps> = observer(({activeNavTab, newCommentCount, onCloseChatPanel}) => {

  const [isDocumentView, setIsDocumentView] = useState(false);

  const renderNotification = () => {
    return (
      <div className="notification-toggle">
        <div className={`notification-icon themed-negative ${activeNavTab}`}>
          {/* <NotificationIcon className={`icon-image themed-negative ${activeNavTab}`}/> */}
          <DocumentsWithCommentsIcon
            className={`icon-image themed-negative ${activeNavTab}`}
            onClick={()=> {
              setIsDocumentView(!isDocumentView);
              console.log("next thing");
            }}
          />
        </div>
        {/* The next line of code is commented out, but deliberately not removed,
            per: https://www.pivotaltracker.com/story/show/179754830 */}
        {/* <div className="new-comment-badge">{newCommentCount}</div> */}
      </div>
    );
  };

  return (
    <div className="chat-panel-header" data-testid="chat-panel-header">
      <ChatIcon className={`chat-icon themed ${activeNavTab} no-action`}/>
      {isDocumentView ? "Documents" : "Comments"}
      {renderNotification()}
      <button className={`chat-close-button themed ${activeNavTab}`}
              data-testid="chat-close-button"
              onClick={() => onCloseChatPanel(false)}/>
    </div>
  );
});
