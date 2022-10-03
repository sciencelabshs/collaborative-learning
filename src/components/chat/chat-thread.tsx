import React, {useEffect, useState} from "react";
import classNames from "classnames";
import { UserModelType } from "../../models/stores/user";
import { WithId } from "../../hooks/firestore-hooks";
import { useUIStore } from "../../hooks/use-stores";
import { CommentDocument } from "../../lib/firestore-schema";
import { CommentCard } from "./comment-card";
import { getToolContentInfoById } from "../../models/tools/tool-content-info";
import UserIcon from "../../assets/icons/clue-dashboard/teacher-student.svg";
import {ChatCommentThread} from "./chat-comment-thread";
import { ToolIconComponent } from "./tool-icon-component";
import { ChatThreadToggle } from "./chat-thread-toggle";

import "./chat-thread.scss";

interface IProps {
  user?: UserModelType;
  activeNavTab?: string;
  chatThreads?: ChatCommentThread[];
  onPostComment?: (comment: string) => void;
  onDeleteComment?: (commentId: string, commentContent: string) => void;
  focusDocument?: string;
  focusTileId?: string;
}

export const ChatThread: React.FC<IProps> = ({ activeNavTab, user, chatThreads, 
  onPostComment, onDeleteComment,
  focusDocument, focusTileId }) => {
  useEffect(() => {
    setExpandedThread(focusTileId || 'document');
  },[focusTileId]);

  // make focusId null if undefined so it can be compared with tileId below.
  const focusId = focusTileId === undefined ? null : focusTileId;
  const focusedItemHasNoComments = !chatThreads?.find(item => (item.tileId === focusId));
  const [expandedThread, setExpandedThread] = useState(focusId || '');
  const ui = useUIStore();
  const handleThreadClick = (clickedId: string | null) => {
    if (clickedId === expandedThread) {
      // We're closing the thread so clear it out.
      setExpandedThread('');
      ui.setSelectedTileId('');
    } else {
      setExpandedThread(clickedId || "document");
      ui.setSelectedTileId(clickedId || '');
    }
  };

  return (
    <div className="chat-list" data-testid="chat-list">
      {chatThreads?.map((commentThread: ChatCommentThread) => {
        const title = commentThread.title || '';
        const shouldShowUserIcon = 
          commentThread.comments.some((comment: WithId<CommentDocument>) => user?.id === comment.uid);
        const numComments = commentThread.comments.length; 
        const shouldBeFocused = commentThread.tileId === focusId;
        const Icon = commentThread.tileType && getToolContentInfoById(commentThread.tileType)?.Icon;
        const key= commentThread.tileId || "document";

        return (
          <div key={key} 
            className={classNames("chat-thread", {
              "chat-thread-focused": shouldBeFocused,
            })}
            data-testid="chat-thread">
            <div className="chat-thread-header"
              onClick={() => handleThreadClick(key)}> 
              <div className="chat-thread-tile-info">
                {Icon && <Icon/>}
                <div className="chat-thread-title"> {title} </div>
              </div>
              <div className="chat-thread-comment-info">  
                {shouldShowUserIcon &&
                  <div className="user-icon" data-testid="chat-thread-user-icon"><UserIcon /></div>
                }
                <div className="chat-thread-num">{numComments}</div>
                <ChatThreadToggle
                  isThreadExpanded={expandedThread === key}
                  activeNavTab={activeNavTab}
                    />
              </div>
            </div> 
            {expandedThread === key &&
              <CommentCard
                user={user}
                activeNavTab={activeNavTab}
                onPostComment={onPostComment}
                onDeleteComment={onDeleteComment}
                postedComments={commentThread.comments}
                focusDocument={focusDocument}
                focusTileId={focusTileId}
              />}
          </div>
          );
        })
      }
      {focusedItemHasNoComments  &&
        <div key={focusTileId ? focusTileId : "document"}
          className="chat-thread should-be-focused"
          data-testid="chat-thread">
          <div className="chat-thread-header"> 
            <div className="chat-thread-tile-info">
              <div className="comment-card-header comment-select" data-testid="comment-card-header">
                <div className="comment-card-header-icon" data-testid="comment-card-header-icon">
                  <ToolIconComponent documentKey={focusDocument} tileId={focusTileId}/>
                </div>
              </div>
              <div className="chat-thread-comment-info">  
                <div className="chat-thread-num">{0}</div>  
              </div>
            </div> 
          </div>
          <CommentCard
            user={user}
            activeNavTab={activeNavTab}
            onPostComment={onPostComment}
            onDeleteComment={onDeleteComment}
            postedComments={[]}
            focusDocument={focusDocument}
            focusTileId={focusTileId}
          />
        </div>
      }
    </div>
  );
};
